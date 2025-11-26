// A globally shared mock instance to control behavior
const mockLimiterInstance = {
  limit: jest.fn().mockResolvedValue({
    success: true,
    remaining: 10,
    reset: 123,
    limit: 30,
  }),
};

// Mock class Ratelimit
class Ratelimit {
  static slidingWindow = jest.fn().mockReturnValue("sliding-window");

  constructor() {
    return mockLimiterInstance;
  }
}

// Mock Redis class
class Redis {
  constructor() {
    return {};
  }
}

module.exports = {
  Ratelimit,
  Redis,
  mockLimiterInstance,
};
