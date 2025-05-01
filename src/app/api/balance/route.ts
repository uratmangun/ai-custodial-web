import ky from 'ky';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_NETWORKS = new Set(['mainnet', 'bsc', 'base', 'arbitrum-one', 'optimism', 'matic', 'unichain']);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const networkIdParam = searchParams.get('network_id');
  const pageParam = searchParams.get('page');

  const apiKey = process.env.THEGRAPH_TOKEN_API_KEY; // Fetch API key from environment variable

  // Validate address
  if (!address) {
    return NextResponse.json({ error: 'Address query parameter is required' }, { status: 400 });
  }

  // Validate and set network_id
  let networkId = 'mainnet'; // Default value
  if (networkIdParam) {
    if (!ALLOWED_NETWORKS.has(networkIdParam)) {
      return NextResponse.json({ error: `Invalid network_id. Allowed values are: ${[...ALLOWED_NETWORKS].join(', ')}` }, { status: 400 });
    }
    networkId = networkIdParam;
  }

  // Validate and set page
  let page = 1; // Default value
  if (pageParam) {
    const pageNumber = parseInt(pageParam, 10);
    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json({ error: 'Invalid page parameter. Must be a number greater than or equal to 1.' }, { status: 400 });
    }
    page = pageNumber;
  }

  // Validate API Key
  if (!apiKey) {
    console.error('THEGRAPH_TOKEN_API_KEY environment variable is not set.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Construct API URL
  const apiUrl = `https://token-api.thegraph.com/balances/evm/${address}?network_id=${networkId}&page=${page}`;

  const options = {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };

  try {
    const response: unknown = await ky.get(apiUrl, options).json();
    // We type as unknown first and then potentially validate/type assert
    // For now, just return the direct response
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching balance from The Graph API:', error);
    // Check if the error is from ky (HTTPError) to get status code
    const status = error?.response?.status || 500;
    const errorMessage = error?.message || 'Failed to fetch balance data';
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
