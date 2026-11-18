import { Router } from 'express';
import { geocode } from '../controllers/geocodeController.js';

const router = Router();

// GET /api/geocode?q=Salt+Lake+City
router.get('/', geocode);

export default router;
