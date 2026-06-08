import { Router, Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { driverService } from '../services/driver.service';
import { approvedImageService } from '../services/approved-image.service';
import { adminAuth } from '../middleware/admin';
import { telegramBot } from '../bot/telegram';

const router = Router();

// Get all settings
router.get('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAll();
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Set channel ID
router.post('/channel', adminAuth, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;
    if (!channelId) {
      res.status(400).json({ error: 'Channel ID is required' });
      return;
    }
    await settingsService.set('channel_id', String(channelId));
    res.json({ success: true, message: 'Channel ID set successfully' });
  } catch (error) {
    console.error('Error setting channel:', error);
    res.status(500).json({ error: 'Failed to set channel' });
  }
});

// Get channel ID
router.get('/channel', adminAuth, async (req: Request, res: Response) => {
  try {
    const channelId = await settingsService.get('channel_id');
    res.json({ channelId: channelId || null });
  } catch (error) {
    console.error('Error getting channel:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
});

// Send approved drivers to channel
router.post('/channel/sync', adminAuth, async (req: Request, res: Response) => {
  try {
    const channelId = await settingsService.get('channel_id');
    if (!channelId) {
      res.status(400).json({ error: 'Channel not configured' });
      return;
    }

    // Get all approved drivers
    const drivers = await driverService.getAll();
    const approvedDrivers = drivers.filter(d => d.status === 'approved');

    if (approvedDrivers.length === 0) {
      res.json({ success: true, message: 'No approved drivers to send' });
      return;
    }

    // Prepare message with all drivers
    let message = '📋 *Approved Drivers List*\n\n';
    message += `Total: *${approvedDrivers.length}* drivers\n`;
    message += '─────────────────────\n\n';

    for (const driver of approvedDrivers) {
      const displayName = driver.admin_name?.trim() || driver.name;
      message += `👤 *${displayName}*\n`;
      if (driver.admin_name?.trim() && driver.admin_name.trim() !== driver.name) {
        message += `📝 _${driver.name}_\n`;
      }
      if (driver.company_id) {
        // Get company name if available
        const companies = await (await import('../services/company.service')).companyService.getById(driver.company_id);
        if (companies) {
          message += `🏢 Company: ${(companies as any).name}\n`;
        }
      }
      if (driver.truck_number) {
        message += `🚚 Truck: ${driver.truck_number}\n`;
      }
      message += `📅 Joined: ${new Date(driver.created_at).toLocaleDateString()}\n`;

      // Get images count
      const images = await approvedImageService.getByDriverId(driver.id);
      if (images && images.length > 0) {
        message += `📸 Photos: ${images.length}\n`;
      }
      message += '\n';
    }

    // Send to channel
    await telegramBot.sendMessage(Number(channelId), message, { parse_mode: 'Markdown' });

    res.json({ success: true, message: 'Drivers sent to channel successfully', count: approvedDrivers.length });
  } catch (error) {
    console.error('Error syncing to channel:', error);
    res.status(500).json({ error: 'Failed to sync drivers to channel' });
  }
});

// Clear all companies
router.post('/clear/companies', adminAuth, async (req: Request, res: Response) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_COMPANIES') {
      res.status(400).json({ error: 'Confirmation required' });
      return;
    }

    const { companyService } = await import('../services/company.service');
    await companyService.deleteAll();
    
    res.json({ success: true, message: 'All companies deleted successfully' });
  } catch (error) {
    console.error('Error clearing companies:', error);
    res.status(500).json({ error: 'Failed to clear companies' });
  }
});

// Clear all drivers
router.post('/clear/drivers', adminAuth, async (req: Request, res: Response) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_DRIVERS') {
      res.status(400).json({ error: 'Confirmation required' });
      return;
    }

    await driverService.deleteAll();
    
    res.json({ success: true, message: 'All drivers deleted successfully' });
  } catch (error) {
    console.error('Error clearing drivers:', error);
    res.status(500).json({ error: 'Failed to clear drivers' });
  }
});

export default router;
