/**
 * 🚀 PAGINATION UTILITY
 * 
 * Helper functions for API pagination and query optimization
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Pagination parameters
 */
export const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50; // Default 50 items per page
  const skip = (page - 1) * limit;
  
  return {
    page,
    limit,
    skip,
    maxLimit: 100 // Maximum items per page to prevent overload
  };
};

/**
 * Apply pagination to a Mongoose query
 * @param {Query} mongooseQuery - Mongoose query object
 * @param {Object} params - Pagination parameters
 * @returns {Query} Modified query
 */
export const applyPagination = (mongooseQuery, params) => {
  const { limit, skip, maxLimit } = params;
  const safeLimit = Math.min(limit, maxLimit);
  
  return mongooseQuery
    .limit(safeLimit)
    .skip(skip);
};

/**
 * Create paginated response with metadata
 * @param {Array} data - Data array
 * @param {number} totalCount - Total count of documents
 * @param {Object} params - Pagination parameters
 * @returns {Object} Paginated response
 */
export const createPaginatedResponse = (data, totalCount, params) => {
  const { page, limit } = params;
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      totalItems: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    }
  };
};

/**
 * Parse field selection from request query
 * @param {Object} query - Express request query object
 * @returns {string} Fields to select
 */
export const getFieldSelection = (query) => {
  if (!query.fields) return '';
  
  // Convert comma-separated fields to space-separated
  return query.fields.replace(/,/g, ' ');
};

/**
 * Parse sort parameters from request query
 * @param {Object} query - Express request query object
 * @param {string} defaultSort - Default sort field
 * @returns {Object} Sort object
 */
export const getSortParams = (query, defaultSort = '-createdAt') => {
  if (!query.sort) return defaultSort;
  
  // Handle multiple sort fields: ?sort=-createdAt,name
  const sortFields = query.sort.split(',').reduce((acc, field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      acc[trimmed.substring(1)] = -1; // Descending
    } else {
      acc[trimmed] = 1; // Ascending
    }
    return acc;
  }, {});
  
  return sortFields;
};

/**
 * Optimize Mongoose query with lean() and select()
 * @param {Query} query - Mongoose query
 * @param {string} fields - Fields to select
 * @param {boolean} useLean - Whether to use lean()
 * @returns {Query} Optimized query
 */
export const optimizeQuery = (query, fields = '', useLean = true) => {
  if (fields) {
    query = query.select(fields);
  }
  
  if (useLean) {
    query = query.lean();
  }
  
  return query;
};

/**
 * Create cache key from request
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
export const createCacheKey = (req) => {
  const { path, query } = req;
  const queryString = JSON.stringify(query);
  return `cache:${path}:${queryString}`;
};

/**
 * Middleware wrapper for paginated endpoints
 * @param {Function} queryFunction - Function that returns Mongoose query
 * @returns {Function} Express middleware
 */
export const paginatedEndpoint = (queryFunction) => {
  return async (req, res, next) => {
    try {
      const paginationParams = getPaginationParams(req.query);
      const fields = getFieldSelection(req.query);
      const sort = getSortParams(req.query);
      
      // Get base query
      const baseQuery = queryFunction(req);
      
      // Count total documents
      const totalCount = await baseQuery.clone().countDocuments();
      
      // Apply optimizations
      let query = baseQuery.clone();
      query = optimizeQuery(query, fields);
      query = applyPagination(query, paginationParams);
      query = query.sort(sort);
      
      // Execute query
      const data = await query.exec();
      
      // Create response
      const response = createPaginatedResponse(data, totalCount, paginationParams);
      res.json(response);
      
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Query optimization helper
 * Applies best practices to Mongoose queries
 * @param {Query} query - Mongoose query
 * @param {Object} options - Optimization options
 * @returns {Query} Optimized query
 */
export const optimizeMongooseQuery = (query, options = {}) => {
  const {
    lean = true,
    select = '',
    populate = '',
    limit = null,
    skip = null,
    sort = null
  } = options;
  
  if (lean) {
    query = query.lean();
  }
  
  if (select) {
    query = query.select(select);
  }
  
  if (populate) {
    // Optimize populate to only select necessary fields
    if (typeof populate === 'string') {
      query = query.populate(populate);
    } else {
      query = query.populate(populate);
    }
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  if (skip) {
    query = query.skip(skip);
  }
  
  if (sort) {
    query = query.sort(sort);
  }
  
  return query;
};

export default {
  getPaginationParams,
  applyPagination,
  createPaginatedResponse,
  getFieldSelection,
  getSortParams,
  optimizeQuery,
  createCacheKey,
  paginatedEndpoint,
  optimizeMongooseQuery
};
