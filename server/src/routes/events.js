import { Router } from 'express';
import { searchEvents, getEventById } from '../controllers/eventsController.js';
import { validateEventSearch } from '../middleware/validate.js';

const router = Router();

// GET /api/events?lat=&lng=&radius=&q=&category=&from=&to=&limit=&offset=
router.get('/', validateEventSearch, searchEvents);
router.get('/:id', getEventById);

export default router;
