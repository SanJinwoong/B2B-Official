// const exampleService = require('../services/example.service');

const getExample = async (req, res, next) => {
  try {
    // const data = await exampleService.getSomeData();
    res.status(200).json({ message: 'Example controller response' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExample
};
