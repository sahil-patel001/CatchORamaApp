import { z } from 'zod';
import { asyncHandler } from './errorHandler.js';

// Generic validation middleware
export const validate = (schema) => {
  return asyncHandler(async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      // Replace req data with validated data
      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;
      
      next();
    } catch (error) {
      next(error);
    }
  });
};

// Validation for body only
export const validateBody = (schema) => {
  return asyncHandler(async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  });
};

// Validation for query parameters only
export const validateQuery = (schema) => {
  return asyncHandler(async (req, res, next) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      next(error);
    }
  });
};

// Validation for URL parameters only
export const validateParams = (schema) => {
  return asyncHandler(async (req, res, next) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      next(error);
    }
  });
};
