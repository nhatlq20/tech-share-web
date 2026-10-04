import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Auth routes initialized' });
});

export default router;
