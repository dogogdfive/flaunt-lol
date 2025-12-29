// app/api/support/route.ts
// Support ticket API - sends to Telegram

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendToTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Failed to send to Telegram:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, orderNumber, walletAddress } = body;

    // Validate required fields
    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: 'Email, subject, and message are required' },
        { status: 400 }
      );
    }

    // Format message for Telegram
    const telegramMessage = `
<b>🎫 New Support Ticket</b>

<b>From:</b> ${name || 'Anonymous'}
<b>Email:</b> ${email}
<b>Wallet:</b> ${walletAddress || 'Not connected'}
${orderNumber ? `<b>Order:</b> ${orderNumber}` : ''}

<b>Subject:</b> ${subject}

<b>Message:</b>
${message}

<i>Sent at: ${new Date().toISOString()}</i>
    `.trim();

    // Send to Telegram
    const sent = await sendToTelegram(telegramMessage);

    if (!sent) {
      // Fallback: log the ticket even if Telegram fails
      console.log('Support ticket received:', {
        name,
        email,
        subject,
        message,
        orderNumber,
        walletAddress,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Support ticket submitted. We\'ll get back to you within 24 hours.',
    });

  } catch (error) {
    console.error('Support ticket error:', error);
    return NextResponse.json(
      { error: 'Failed to submit support ticket' },
      { status: 500 }
    );
  }
}
