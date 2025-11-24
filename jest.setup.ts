// In our Jest tests we dont output logs we only output errors
jest.spyOn(console, "log").mockImplementation(() => {});
