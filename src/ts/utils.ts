import {
  waitForPXE,
  createPXEClient,
} from '@aztec/aztec.js';

export const createPXE = async (id: number = 0) => {
  const { BASE_PXE_URL = `http://localhost` } = process.env;
  const url = `${BASE_PXE_URL}:${8080 + id}`;
  const pxe = createPXEClient(url);
  await waitForPXE(pxe);
  return pxe;
};

export const setupSandbox = async () => {
  return createPXE();
};

