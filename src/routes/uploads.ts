import { Router, Request, Response } from 'express';
import { uploadService } from '../services/upload.service';
import { driverService } from '../services/driver.service';
import { approvedImageService } from '../services/approved-image.service';
import { companyService } from '../services/company.service';
import { settingsService } from '../services/settings.service';
import { telegramBot } from '../bot/telegram';
import { adminAuth } from '../middleware/admin';

const router = Router();

// Get all companies (for dropdown)
router.get('/data/companies', adminAuth, async (req: Request, res: Response) => {
  try {
    const companies = await companyService.getAll();
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get all pending uploads
router.get('/pending', adminAuth, async (req: Request, res: Response) => {
  try {
    const uploads = await uploadService.getPending();
    res.json(uploads);
  } catch (error) {
    console.error('Error fetching pending uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// Get single upload details
router.get('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const upload = await uploadService.getById(req.params.id);
    if (!upload) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const images = await approvedImageService.getByUploadId(upload.id);
    const driver = await driverService.getById(upload.driver_id);

    res.json({ upload, images, driver });
  } catch (error) {
    console.error('Error fetching upload:', error);
    res.status(500).json({ error: 'Failed to fetch upload' });
  }
});

// Approve upload
router.post('/:id/approve', adminAuth, async (req: Request, res: Response) => {
  try {
    const { company_id, truck_number, selected_indexes, checklist } = req.body;
    const upload = await uploadService.getById(req.params.id);
    if (!upload) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    const storedFileIds = upload.file_ids ? JSON.parse(upload.file_ids) : [];
    const fileIds = Array.isArray(storedFileIds) ? storedFileIds : [];

    let approvedFileIds = fileIds;
    if (Array.isArray(selected_indexes)) {
      approvedFileIds = selected_indexes
        .map((index: number) => fileIds[index])
        .filter(Boolean);
    }

    if (!Array.isArray(approvedFileIds) || approvedFileIds.length === 0) {
      res.status(400).json({ error: 'At least one image must be selected for approval' });
      return;
    }

    // Update upload status
    await uploadService.updateStatus(upload.id, 'approved');

    // Get driver info
    const driver = await driverService.getById(upload.driver_id);
    if (driver && driver.status === 'pending') {
      await driverService.updateStatus(driver.id, 'approved');
    }

    if (company_id && driver) {
      await driverService.assignToCompany(driver.id, company_id);
    }

    if (truck_number && driver) {
      await driverService.updateTruckNumber(driver.id, truck_number);
    }

    // Save approved images to database
    for (const fileId of approvedFileIds) {
      await approvedImageService.create(upload.id, 0, fileId);
    }

    // Display name prefers the admin's clarifying label, falls back to Telegram name
    const driverDisplayName = driver?.admin_name?.trim() || driver?.name;

    // Send admin notification
    const notificationMsg = `✅ Upload approved!\nDriver: ${driverDisplayName}${truck_number ? '\n🚛 Truck: ' + truck_number : ''}\nImages approved: ${approvedFileIds.length}`;
    await telegramBot.sendAdminNotification(notificationMsg);

    // Send approval info to configured channel with message + images
    try {
      const configChannelId =
        (await settingsService.get('channel_id')) ||
        process.env.PRIVATE_CHANNEL_ID ||
        null;
      if (configChannelId && driver) {
        // Build checklist status
        const hasIssues = 
          (checklist?.no_manuals) || 
          (checklist?.no_tablet) || 
          (checklist?.no_paperlog);
        
        let checklistStatus = '';
        if (!hasIssues) {
          checklistStatus = '✅ *All Good! No Issues*';
        } else {
          checklistStatus = '⚠️ *Issues Detected:*\n';
          if (checklist?.no_manuals) checklistStatus += '• 📋 No Manuals\n';
          if (checklist?.no_tablet) checklistStatus += '• ❌ No Tablet Holder\n';
          if (checklist?.no_paperlog) checklistStatus += '• 📄 No Paperlog\n';
        }

        // Get company name if assigned
        let companyName = '';
        if (company_id) {
          const company = await companyService.getById(company_id);
          companyName = company?.name || '';
        }

        // Format approval message with driver info
        let approvalMsg = `🎉 *Driver Approved!*\n\n`;
        approvalMsg += `👤 *Name:* ${driverDisplayName}\n`;
        if (driver.admin_name?.trim() && driver.admin_name.trim() !== driver.name) {
          approvalMsg += `📝 *Telegram name:* ${driver.name}\n`;
        }
        if (companyName) {
          approvalMsg += `🏢 *Company:* ${companyName}\n`;
        }
        if (truck_number) {
          approvalMsg += `🚚 *Truck:* ${truck_number}\n`;
        }
        approvalMsg += `📅 *Joined:* ${new Date(driver.created_at).toLocaleDateString()}\n`;
        approvalMsg += `📸 *Photos Approved:* ${approvedFileIds.length}\n\n`;
        approvalMsg += checklistStatus;

        console.log(`[Channel] Sending to channel ${configChannelId}: ${approvalMsg}`);

        // Send message first
        await telegramBot.sendMessage(Number(configChannelId), approvalMsg, { parse_mode: 'Markdown' });

        // Then send each approved image and update message_id in DB
        for (const fileId of approvedFileIds) {
          try {
            const sent = await telegramBot.sendPhoto(Number(configChannelId), fileId);
            if (sent?.message_id) {
              const existing = await approvedImageService.getByUploadIdAndFileId(
                upload.id,
                fileId
              );
              if (existing) {
                await approvedImageService.updateMessageId(existing.id, sent.message_id);
              }
            }
          } catch (error) {
            console.error('Error sending photo to channel:', error);
          }
        }

        console.log(`[Channel] Successfully sent approval message and ${approvedFileIds.length} images to channel`);
      } else {
        console.warn('[Channel] Not sending to channel - either not configured or no driver info');
      }
    } catch (error) {
      console.error('[Channel] Error in approval notification:', error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error approving upload:', error);
    res.status(500).json({ error: 'Failed to approve upload' });
  }
});

// Get image URLs for pending upload
router.get('/:id/images', adminAuth, async (req: Request, res: Response) => {
  try {
    const upload = await uploadService.getById(req.params.id);
    if (!upload) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    if (upload.status === 'pending') {
      const fileIds = upload.file_ids ? JSON.parse(upload.file_ids) : [];
      
      // Generate URLs for pending images
      const imageUrls = await Promise.all(
        fileIds.map(async (fileId: string) => {
          const url = await telegramBot.getFileLink(fileId);
          return { fileId, url: url || '' };
        })
      );
      
      res.json({ images: imageUrls });
    } else {
      // Get approved images from database
      const images = await approvedImageService.getByUploadId(upload.id);
      const imageUrls = await Promise.all(
        images.map(async (img: any) => {
          const url = await telegramBot.getFileLink(img.file_id);
          return { fileId: img.file_id, url: url || '', messageId: img.message_id };
        })
      );
      
      res.json({ images: imageUrls });
    }
  } catch (error) {
    console.error('Error fetching image URLs:', error);
    res.status(500).json({ error: 'Failed to fetch image URLs' });
  }
});

// Reject upload
router.post('/:id/reject', adminAuth, async (req: Request, res: Response) => {
  try {
    const upload = await uploadService.getById(req.params.id);
    if (!upload) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    // Update upload status
    await uploadService.updateStatus(upload.id, 'rejected');

    const driver = await driverService.getById(upload.driver_id);

    if (driver && driver.status === 'pending') {
      await driverService.updateStatus(driver.id, 'rejected');
    }

    // Send notification
    await telegramBot.sendAdminNotification(
      `❌ Upload rejected!\nDriver: ${driver?.name}\nImages: ${upload.image_count}`
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting upload:', error);
    res.status(500).json({ error: 'Failed to reject upload' });
  }
});

export default router;
