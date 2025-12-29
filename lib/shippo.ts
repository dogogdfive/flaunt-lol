// lib/shippo.ts
// Shippo shipping label integration

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY || '';
const SHIPPO_API_URL = 'https://api.goshippo.com';

interface Address {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

interface Parcel {
  length: number;
  width: number;
  height: number;
  distance_unit: 'in' | 'cm';
  weight: number;
  mass_unit: 'lb' | 'oz' | 'kg' | 'g';
}

interface ShippoRate {
  object_id: string;
  provider: string;
  servicelevel: {
    name: string;
    token: string;
  };
  amount: string;
  currency: string;
  estimated_days: number;
  duration_terms: string;
}

interface ShippoShipment {
  object_id: string;
  status: string;
  rates: ShippoRate[];
}

interface ShippoTransaction {
  object_id: string;
  status: string;
  tracking_number: string;
  tracking_url_provider: string;
  label_url: string;
  rate: string;
}

// Create a shipment and get rates
export async function createShipment(
  fromAddress: Address,
  toAddress: Address,
  parcel: Parcel = {
    length: 10,
    width: 8,
    height: 4,
    distance_unit: 'in',
    weight: 1,
    mass_unit: 'lb',
  }
): Promise<{ success: boolean; shipment?: ShippoShipment; rates?: ShippoRate[]; error?: string }> {
  if (!SHIPPO_API_KEY) {
    return { success: false, error: 'Shippo API key not configured' };
  }

  try {
    const response = await fetch(`${SHIPPO_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from: fromAddress,
        address_to: toAddress,
        parcels: [parcel],
        async: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Shippo error:', data);
      return { success: false, error: data.detail || 'Failed to create shipment' };
    }

    return {
      success: true,
      shipment: data,
      rates: data.rates?.filter((r: ShippoRate) => r.servicelevel) || [],
    };
  } catch (error) {
    console.error('Shippo API error:', error);
    return { success: false, error: 'Failed to connect to Shippo' };
  }
}

// Purchase a shipping label
export async function purchaseLabel(
  rateId: string
): Promise<{ success: boolean; transaction?: ShippoTransaction; error?: string }> {
  if (!SHIPPO_API_KEY) {
    return { success: false, error: 'Shippo API key not configured' };
  }

  try {
    const response = await fetch(`${SHIPPO_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rate: rateId,
        label_file_type: 'PDF',
        async: false,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === 'ERROR') {
      console.error('Shippo label error:', data);
      return { success: false, error: data.messages?.[0]?.text || 'Failed to purchase label' };
    }

    return {
      success: true,
      transaction: data,
    };
  } catch (error) {
    console.error('Shippo label API error:', error);
    return { success: false, error: 'Failed to purchase label' };
  }
}

// Get tracking info
export async function getTracking(
  carrier: string,
  trackingNumber: string
): Promise<{ success: boolean; tracking?: any; error?: string }> {
  if (!SHIPPO_API_KEY) {
    return { success: false, error: 'Shippo API key not configured' };
  }

  try {
    const response = await fetch(
      `${SHIPPO_API_URL}/tracks/${carrier}/${trackingNumber}`,
      {
        headers: {
          'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: 'Failed to get tracking info' };
    }

    return {
      success: true,
      tracking: data,
    };
  } catch (error) {
    console.error('Shippo tracking error:', error);
    return { success: false, error: 'Failed to get tracking' };
  }
}

// Validate address
export async function validateAddress(
  address: Address
): Promise<{ success: boolean; isValid: boolean; messages?: string[] }> {
  if (!SHIPPO_API_KEY) {
    return { success: false, isValid: false, messages: ['Shippo API key not configured'] };
  }

  try {
    const response = await fetch(`${SHIPPO_API_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...address,
        validate: true,
      }),
    });

    const data = await response.json();

    return {
      success: true,
      isValid: data.validation_results?.is_valid || false,
      messages: data.validation_results?.messages?.map((m: any) => m.text) || [],
    };
  } catch (error) {
    console.error('Address validation error:', error);
    return { success: false, isValid: false, messages: ['Validation failed'] };
  }
}

// Default store address (for label generation)
export const DEFAULT_FROM_ADDRESS: Address = {
  name: process.env.STORE_NAME || 'Flaunt.lol',
  street1: process.env.STORE_ADDRESS_LINE1 || '123 Main St',
  city: process.env.STORE_CITY || 'Los Angeles',
  state: process.env.STORE_STATE || 'CA',
  zip: process.env.STORE_ZIP || '90001',
  country: process.env.STORE_COUNTRY || 'US',
};
