import { Router, Request, Response } from 'express';
import { driverService } from '../services/driver.service';
import { approvedImageService } from '../services/approved-image.service';
import { adminAuth } from '../middleware/admin';

const router = Router();

// Search drivers
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const drivers = await driverService.searchByName(req.params.query);

    // Get approved images for each driver
    const driversWithImages = await Promise.all(
      drivers.map(async (driver) => {
        const images = await approvedImageService.getByDriverId(driver.id);
        return { ...driver, images };
      })
    );

    res.json(driversWithImages);
  } catch (error) {
    console.error('Error searching drivers:', error);
    res.status(500).json({ error: 'Failed to search drivers' });
  }
});

// Get driver by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const driver = await driverService.getById(req.params.id);
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const images = await approvedImageService.getByDriverId(driver.id);
    res.json({ ...driver, images });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// Get all approved drivers
router.get('/', async (req: Request, res: Response) => {
  try {
    const drivers = await driverService.getAllApproved();
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Assign driver to company (admin only)
router.post('/:id/assign', adminAuth, async (req: Request, res: Response) => {
  try {
    const { company_id } = req.body;
    if (!company_id) {
      res.status(400).json({ error: 'company_id is required' });
      return;
    }

    await driverService.assignToCompany(req.params.id, company_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// Update driver (admin only)
router.put('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, truck_number } = req.body;
    const driver = await driverService.getById(req.params.id);

    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    if (name) {
      const now = new Date().toISOString();
      await (global as any).db?.run?.(
        'UPDATE drivers SET name = ?, updated_at = ? WHERE id = ?',
        [name, now, req.params.id]
      );
    }

    if (truck_number) {
      await driverService.updateTruckNumber(req.params.id, truck_number);
    }

    const updated = await driverService.getById(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// Delete driver (admin only)
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const driver = await driverService.getById(req.params.id);
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    // Delete associated images and uploads
    await (global as any).db?.run?.(
      'DELETE FROM drivers WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

export default router;
