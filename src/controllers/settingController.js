import Setting from '../models/Setting.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.get();
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.get();
  settings.set(req.body);
  await settings.save();
  res.json({ success: true, data: settings });
});
