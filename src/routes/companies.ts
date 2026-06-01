import { Router, Request, Response } from 'express';
import { companyService } from '../services/company.service';
import { driverService } from '../services/driver.service';
import { approvedImageService } from '../services/approved-image.service';
import { adminAuth } from '../middleware/admin';

const router = Router();

// Get all companies
router.get('/', async (req: Request, res: Response) => {
  try {
    const companies = await companyService.getAll();
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Search companies
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const companies = await companyService.searchByName(req.params.query);
    res.json(companies);
  } catch (error) {
    console.error('Error searching companies:', error);
    res.status(500).json({ error: 'Failed to search companies' });
  }
});

// Get company with drivers
router.get('/:id/drivers', async (req: Request, res: Response) => {
  try {
    const company = await companyService.getById(req.params.id);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const drivers = await driverService.getByCompany(req.params.id);

    // Get approved images for each driver
    const driversWithImages = await Promise.all(
      drivers.map(async (driver) => {
        const images = await approvedImageService.getByDriverId(driver.id);
        return { ...driver, images };
      })
    );

    res.json({ company, drivers: driversWithImages });
  } catch (error) {
    console.error('Error fetching company drivers:', error);
    res.status(500).json({ error: 'Failed to fetch company drivers' });
  }
});

// Create company (admin only)
router.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const existing = await companyService.getByName(name);
    if (existing) {
      res.status(400).json({ error: 'Company already exists' });
      return;
    }

    const company = await companyService.create(name);
    res.json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company (admin only)
router.put('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const company = await companyService.getById(req.params.id);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Check if new name already exists (and it's not the same company)
    const existing = await companyService.getByName(name);
    if (existing && existing.id !== req.params.id) {
      res.status(400).json({ error: 'Company name already exists' });
      return;
    }

    await companyService.updateName(req.params.id, name);
    const updated = await companyService.getById(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company (admin only)
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const company = await companyService.getById(req.params.id);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Check if company has drivers
    const drivers = await driverService.getByCompany(req.params.id);
    if (drivers.length > 0) {
      res.status(400).json({ error: 'Cannot delete company with drivers. Please reassign drivers first.' });
      return;
    }

    await companyService.delete(req.params.id);
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;
