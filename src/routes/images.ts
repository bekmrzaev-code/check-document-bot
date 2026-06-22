import { Router, Request, Response } from 'express';
import { telegramBot } from '../bot/telegram';
import { approvedImageService } from '../services/approved-image.service';

const router = Router();

// Get file link directly from file_id (for pending uploads)
router.get('/file/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const fileLink = await telegramBot.getFileLink(fileId);
    
    if (!fileLink) {
      res.status(404).json({ error: 'Image file not available' });
      return;
    }

    res.set('Cache-Control', 'private, max-age=3000');
    res.redirect(fileLink);
  } catch (error) {
    console.error('Error getting file link:', error);
    res.status(500).json({ error: 'Failed to get file link' });
  }
});

// Redirect to Telegram direct file URL for a saved approved image
router.get('/:messageId', async (req: Request, res: Response) => {
  try {
    const messageId = Number(req.params.messageId);

    if (Number.isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid message ID' });
      return;
    }

    const approvedImage = await approvedImageService.getByMessageId(messageId);
    if (!approvedImage || !approvedImage.file_id) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const fileLink = await telegramBot.getFileLink(approvedImage.file_id);
    if (!fileLink) {
      res.status(404).json({ error: 'Image file not available' });
      return;
    }

    res.set('Cache-Control', 'private, max-age=3000');
    res.redirect(fileLink);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Return direct file URL for image
router.get('/:messageId/url', async (req: Request, res: Response) => {
  try {
    const messageId = Number(req.params.messageId);

    if (Number.isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid message ID' });
      return;
    }

    const approvedImage = await approvedImageService.getByMessageId(messageId);
    if (!approvedImage || !approvedImage.file_id) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const fileLink = await telegramBot.getFileLink(approvedImage.file_id);
    if (!fileLink) {
      res.status(404).json({ error: 'Image file not available' });
      return;
    }

    res.json({ url: fileLink });
  } catch (error) {
    console.error('Error getting image URL:', error);
    res.status(500).json({ error: 'Failed to get image URL' });
  }
});

export default router;
