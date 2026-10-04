import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Device routes initialized' });
});

export default router;
