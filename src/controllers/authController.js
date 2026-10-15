import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const userCount = await User.countDocuments();
  // First user always becomes admin; afterwards only admins may create staff
  const finalRole = userCount === 0 ? 'admin' : role;

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: finalRole });

  res.status(201).json({
    success: true,
    data: { user: user.toSafeJSON(), token: signToken(user._id) },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.active) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw ApiError.unauthorized('Invalid email or password');

  res.json({
    success: true,
    data: { user: user.toSafeJSON(), token: signToken(user._id) },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw ApiError.badRequest('Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ success: true, message: 'Password updated' });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort('name');
  res.json({ success: true, data: users.map((u) => u.toSafeJSON()) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, role, active } = req.body;

  if (id === req.user._id.toString() && (role || active === false)) {
    throw ApiError.badRequest('You cannot change your own role or deactivate yourself');
  }

  const user = await User.findByIdAndUpdate(
    id,
    { ...(name !== undefined && { name }), ...(role && { role }), ...(active !== undefined && { active }) },
    { new: true, runValidators: true }
  );
  if (!user) throw ApiError.notFound('User not found');

  res.json({ success: true, data: user.toSafeJSON() });
});
