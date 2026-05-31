import { Router, Request, Response } from 'express';
import { uploadService } from '../services/upload.service';
import { driverService } from '../services/driver.service';
import { approvedImageService } from '../services/approved-image.service';
import { telegramBot } from '../bot/telegram';
import { adminAuth } from '../middleware/admin';

const router = Router();

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
    const upload = await uploadService.getById(req.params.id);
    if (!upload) {
      res.status(404).json({ error: 'Upload not found' });
      return;
    }

    // Get cached file_ids
    const imageCache = (global as any).imageCache || {};
    const fileIds = imageCache[upload.id] || [];

    // Update upload status
    await uploadService.updateStatus(upload.id, 'approved');

    // Upload images to private channel and save channel message IDs + file IDs
    const channelId = process.env.PRIVATE_CHANNEL_ID;
    if (channelId && fileIds.length > 0) {
      try {
        const messageIds = await telegramBot.uploadToPrivateChannel(fileIds, channelId);
        for (let i = 0; i < messageIds.length; i++) {
          await approvedImageService.create(upload.id, messageIds[i], fileIds[i]);
        }
      } catch (error) {
        console.error('Error uploading to private channel:', error);
      }
    }

    // Update driver status to approved if it was pending
    const driver = await driverService.getById(upload.driver_id);
    if (driver && driver.status === 'pending') {
      await driverService.updateStatus(driver.id, 'approved');
    }

    // Send notification
    await telegramBot.sendAdminNotification(
      `✅ Upload approved!\nDriver: ${driver?.name}\nImages: ${upload.image_count}`
    );

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

    // Clear cache
    const imageCache = (global as any).imageCache || {};
    delete imageCache[upload.id];

    const driver = await driverService.getById(upload.driver_id);

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
