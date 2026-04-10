const axios = require('axios');

const BITRA_BASE_URL = 'https://bitrahq.com/api/v1/services.php';

const getBitraApiKey = () => process.env.BITRA_API_KEY;

exports.buyAirtime = async ({ network, phone, amount, ref }) => {
  try {
    const payload = {
      api_key: getBitraApiKey(),
      service: 'airtime',
      network: network.toLowerCase(),
      phone,
      amount,
      ref,
    };

    const response = await axios.post(BITRA_BASE_URL, payload, {
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('❌ BitraHQ airtime error:', error.message);
    return {
      status: 'failed',
      message: error.message,
    };
  }
};

exports.buyData = async ({ network, phone, plan, ref }) => {
  try {
    const payload = {
      api_key: getBitraApiKey(),
      service: 'data',
      network: network.toLowerCase(),
      phone,
      plan,
      ref,
    };

    const response = await axios.post(BITRA_BASE_URL, payload, {
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('❌ BitraHQ data error:', error.message);
    return {
      status: 'failed',
      message: error.message,
    };
  }
};

exports.getDataPlans = async (network) => {
  try {
    const payload = {
      api_key: getBitraApiKey(),
      service: 'data',
      network: network.toLowerCase(),
      method: 'get_plans',
    };

    const response = await axios.post(BITRA_BASE_URL, payload, {
      timeout: 10000,
    });

    if (response.data && Array.isArray(response.data.plans)) {
      return response.data.plans;
    }

    return [];
  } catch (error) {
    console.error('❌ BitraHQ plans error:', error.message);
    return [];
  }
};
