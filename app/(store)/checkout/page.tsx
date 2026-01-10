// app/(store)/checkout/page.tsx
// Checkout page with shipping form and payment

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  CreditCard,
  Truck,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast, showTxSuccess } from '@/lib/toast';
import { parseTxError, logTxError } from '@/lib/tx-errors';
import { logger } from '@/lib/logger';

// Solana config
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const DEFAULT_PLATFORM_WALLET = '5CoxdsuoRHDwDPVYqPoeiJxWZ588jXhpimCRJUj8FUN1';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;

interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceSol: number;
    priceUsdc: number | null;
    images: string[];
    quantity: number;
    allowsShipping: boolean;
    allowsLocalPickup: boolean;
    store: {
      id: string;
      name: string;
      slug: string;
    };
  };
  variant: {
    id: string;
    name: string;
    priceSol: number | null;
    quantity: number;
  } | null;
  itemTotal: number;
  itemTotalUsdc: number;
}

type CheckoutStep = 'cart' | 'fulfillment' | 'shipping' | 'payment' | 'success';
type FulfillmentType = 'SHIPPING' | 'LOCAL_PICKUP';

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  // Prevent SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = mounted ? wallet.connected : false;
  const publicKey = mounted ? wallet.publicKey : null;
  
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalSol, setTotalSol] = useState(0);
  const [totalUsdcFromCart, setTotalUsdcFromCart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cartFetched, setCartFetched] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Payment method: 'connected' for connected wallet, 'external' for another wallet, 'moonpay' for MoonPay
  const [paymentMethod, setPaymentMethod] = useState<'connected' | 'external' | 'moonpay'>('connected');
  
  // MoonPay payment type: 'solana', 'ethereum', 'usdt', 'debit_card'
  const [moonpayPaymentType, setMoonpayPaymentType] = useState<'solana' | 'ethereum' | 'usdt' | 'debit_card'>('debit_card');
  const [moonpayUrl, setMoonpayUrl] = useState<string | null>(null);
  const [moonpayOrderId, setMoonpayOrderId] = useState<string | null>(null);

  // Fulfillment type
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('SHIPPING');
  const [pickupNotes, setPickupNotes] = useState('');

  // Check if any items support local pickup
  const hasPickupOption = cartItems.some(item => item.product.allowsLocalPickup);
  // Check if all items support local pickup (required for pickup to be available)
  const allSupportPickup = cartItems.length > 0 && cartItems.every(item => item.product.allowsLocalPickup);

  // External payment state
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [manualTxSignature, setManualTxSignature] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Platform wallet from settings
  const [platformWallet, setPlatformWallet] = useState(DEFAULT_PLATFORM_WALLET);

  // Fetch platform wallet from settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings/public');
        const data = await res.json();
        if (data.platformWallet) {
          setPlatformWallet(data.platformWallet);
        }
      } catch (error) {
        console.error('Failed to fetch platform settings:', error);
      }
    }
    fetchSettings();
  }, []);

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(platformWallet);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const copyPaymentAmount = () => {
    navigator.clipboard.writeText(totalUsdc.toFixed(2));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const copyMemo = () => {
    if (pendingOrder?.orders?.[0]?.orderNumber) {
      navigator.clipboard.writeText(pendingOrder.orders[0].orderNumber);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    }
  };

  const [orderResult, setOrderResult] = useState<any>(null);

  // Payment currency (for direct wallet payments)
  const [paymentCurrency, setPaymentCurrency] = useState<'SOL' | 'USDC'>('USDC');
  const [solPrice, setSolPrice] = useState<number>(200);
  const [priceLoading, setPriceLoading] = useState(true);

  // Use USDC total from cart (based on stored product prices)
  const totalUsdc = totalUsdcFromCart;

  // Shipping form
  const [shippingForm, setShippingForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });

  // Fetch SOL price
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const res = await fetch('/api/price');
        const data = await res.json();
        if (data.success && data.price) {
          setSolPrice(data.price);
        }
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
      } finally {
        setPriceLoading(false);
      }
    }
    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Wait for mount to complete before checking connection state
    if (!mounted) return;

    if (connected && publicKey) {
      fetchCart();
    } else {
      setLoading(false);
    }

    // Check for MoonPay redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'moonpay') {
      const orderId = urlParams.get('orderId');
      const status = urlParams.get('status');
      
      if (orderId && status === 'pending') {
        setMoonpayOrderId(orderId);
        setMoonpayUrl('pending');
        setPaymentMethod('moonpay');
        setStep('payment');
        
        // Poll for payment status
        const checkPaymentStatus = async () => {
          try {
            const res = await fetch(`/api/orders/${orderId}`, {
              credentials: 'include',
            });
            const data = await res.json();
            if (data.order?.paymentStatus === 'COMPLETED') {
              setOrderResult({ orders: [{ id: orderId, orderNumber: data.order.orderNumber }] });
              setStep('success');
              // Clean URL
              window.history.replaceState({}, '', '/checkout');
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        };

        // Check immediately and then every 3 seconds
        checkPaymentStatus();
        const interval = setInterval(checkPaymentStatus, 3000);
        
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(interval), 120000);
      } else if (orderId && status === 'completed') {
        setStep('success');
        // Clean URL
        window.history.replaceState({}, '', '/checkout');
      }
    }
  }, [mounted, connected, publicKey]);

  const fetchCart = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/cart', {
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setCartItems(data.items);
        setTotalSol(data.totalSol);
        setTotalUsdcFromCart(data.totalUsdc || data.totalSol * 200);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
      setCartFetched(true);
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (!publicKey) return;
    setUpdating(cartItemId);
    try {
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({ cartItemId, quantity: newQuantity }),
      });

      if (res.ok) {
        fetchCart();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update quantity');
      }
    } catch (error) {
      logger.error('Failed to update quantity', { error, cartItemId });
      showError('Failed to update cart');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (cartItemId: string) => {
    if (!publicKey) return;
    setUpdating(cartItemId);
    try {
      const res = await fetch(`/api/cart?id=${cartItemId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
        },
      });
      if (res.ok) {
        showSuccess('Item removed from cart');
        fetchCart();
      } else {
        showError('Failed to remove item');
      }
    } catch (error) {
      logger.error('Failed to remove item', { error, cartItemId });
      showError('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handleCheckout = async () => {
    console.log('handleCheckout called');
    console.log('publicKey:', publicKey?.toBase58());
    console.log('wallet.sendTransaction:', !!wallet.sendTransaction);

    setCheckoutLoading(true);
    setError('');

    try {
      // 1. Check wallet is connected
      if (!publicKey || !wallet.sendTransaction) {
        console.error('Wallet not ready:', { publicKey: !!publicKey, sendTransaction: !!wallet.sendTransaction });
        throw new Error('Please connect your Solana wallet');
      }

      console.log('Creating order...');

      // 2. Create order (PENDING status)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingAddress: fulfillmentType === 'SHIPPING' ? {
            name: shippingForm.name,
            line1: shippingForm.line1,
            line2: shippingForm.line2 || undefined,
            city: shippingForm.city,
            state: shippingForm.state,
            postalCode: shippingForm.postalCode,
            country: shippingForm.country,
            phone: shippingForm.phone || undefined,
          } : undefined,
          email: shippingForm.email,
          currency: paymentCurrency,
          fulfillmentType,
          pickupNotes: fulfillmentType === 'LOCAL_PICKUP' ? pickupNotes : undefined,
        }),
      });

      const orderData = await res.json();
      console.log('Order created:', orderData);

      if (!res.ok) {
        console.error('Order creation failed:', orderData);
        throw new Error(orderData.error || 'Failed to create order');
      }

      console.log(`Building ${paymentCurrency} transaction...`);
      // 3. Send payment transaction
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const platformPubkey = new PublicKey(platformWallet);
      const payerPubkey = publicKey;

      let transaction: Transaction;

      if (paymentCurrency === 'SOL') {
        // SOL transfer
        const solAmount = totalUsdc / solPrice;
        const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

        // Check SOL balance
        const balance = await connection.getBalance(payerPubkey);
        const balanceInSol = balance / LAMPORTS_PER_SOL;
        console.log('Sender SOL balance:', balanceInSol);

        if (balance < lamports + 5000) { // 5000 lamports for fees
          throw new Error(`Insufficient SOL balance. You have ${balanceInSol.toFixed(4)} SOL but need ${solAmount.toFixed(4)} SOL plus fees.`);
        }

        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: payerPubkey,
            toPubkey: platformPubkey,
            lamports,
          })
        );
      } else {
        // USDC transfer
        const amount = Math.floor(totalUsdc * Math.pow(10, USDC_DECIMALS));

        const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, payerPubkey);
        const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, platformPubkey);

        // Check if sender has USDC token account and sufficient balance
        console.log('Checking sender USDC account...');
        try {
          const senderAccount = await getAccount(connection, fromTokenAccount);
          const balance = Number(senderAccount.amount) / Math.pow(10, USDC_DECIMALS);
          console.log('Sender USDC balance:', balance);
          if (balance < totalUsdc) {
            throw new Error(`Insufficient USDC balance. You have $${balance.toFixed(2)} but need $${totalUsdc.toFixed(2)}`);
          }
        } catch (err: any) {
          if (err.message?.includes('Insufficient USDC')) {
            throw err;
          }
          console.error('Sender USDC account error:', err);
          throw new Error('You need USDC in your wallet to complete this purchase. Please add USDC to your wallet first.');
        }

        // Check if platform's token account exists
        let instructions = [];
        try {
          await getAccount(connection, toTokenAccount);
        } catch {
          // Create associated token account for platform if it doesn't exist
          console.log('Creating platform USDC token account...');
          instructions.push(
            createAssociatedTokenAccountInstruction(
              payerPubkey,
              toTokenAccount,
              platformPubkey,
              USDC_MINT
            )
          );
        }

        instructions.push(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            payerPubkey,
            amount
          )
        );

        transaction = new Transaction().add(...instructions);
      }

      // Get recent blockhash
      console.log('Getting blockhash...');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payerPubkey;

      // 4. Request wallet signature and send using sendTransaction (more universally supported)
      console.log('Sending transaction to wallet for approval...');
      const txSignature = await wallet.sendTransaction(transaction, connection);
      console.log('Transaction sent:', txSignature);

      // 5. Wait for confirmation with retry logic
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max

      while (!confirmed && attempts < maxAttempts) {
        try {
          const status = await connection.getSignatureStatus(txSignature);
          if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
            confirmed = true;
            console.log('Transaction confirmed:', status.value.confirmationStatus);
          } else if (status?.value?.err) {
            throw new Error('Transaction failed on chain');
          } else {
            // Wait 2 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
        } catch (statusErr) {
          console.log('Status check attempt', attempts, statusErr);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }

      if (!confirmed) {
        throw new Error('Transaction confirmation timed out. Please check your wallet - the transaction may still complete.');
      }

      // 6. Confirm payment with backend
      const confirmRes = await fetch(`/api/orders/${orderData.orders[0].id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({ txSignature }),
      });

      if (!confirmRes.ok) {
        const confirmData = await confirmRes.json();
        throw new Error(confirmData.error || 'Failed to confirm payment');
      }

      // 7. Success!
      logger.payment('Payment completed', { txSignature, orderId: orderData.orders[0]?.id, amount: totalUsdc, currency: paymentCurrency });
      showTxSuccess(txSignature);
      setOrderResult({ ...orderData, txSignature });
      setStep('success');

    } catch (err: any) {
      // Log error with context
      logTxError(err, { action: 'checkout', currency: paymentCurrency, amount: totalUsdc });

      // Parse error into user-friendly message
      const userMessage = parseTxError(err);
      setError(userMessage);
      showError(userMessage);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Create order for external wallet payment (without sending transaction)
  const createOrderForExternalPayment = async () => {
    setCheckoutLoading(true);
    setError('');

    try {
      if (!publicKey) {
        throw new Error('Please connect your wallet first');
      }

      // Create order (PENDING status)
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingAddress: {
            name: shippingForm.name,
            line1: shippingForm.line1,
            line2: shippingForm.line2 || undefined,
            city: shippingForm.city,
            state: shippingForm.state,
            postalCode: shippingForm.postalCode,
            country: shippingForm.country,
            phone: shippingForm.phone || undefined,
          },
          email: shippingForm.email,
          currency: 'USDC',
        }),
      });

      const orderData = await res.json();

      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Store the pending order
      setPendingOrder(orderData);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Verify external payment with manually entered transaction signature
  const verifyExternalPayment = async () => {
    if (!manualTxSignature.trim()) {
      setError('Please enter the transaction signature');
      return;
    }

    if (!pendingOrder?.orders?.[0]?.id) {
      setError('No pending order found. Please try again.');
      return;
    }

    setVerifyingPayment(true);
    setError('');

    try {
      const confirmRes = await fetch(`/api/orders/${pendingOrder.orders[0].id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey?.toBase58() || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          txSignature: manualTxSignature.trim(),
          expectedMemo: pendingOrder.orders[0].orderNumber,
        }),
      });

      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        throw new Error(confirmData.error || 'Payment verification failed');
      }

      // Success!
      setOrderResult({ ...pendingOrder, txSignature: manualTxSignature.trim() });
      setStep('success');
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setError(err instanceof Error ? err.message : 'Payment verification failed');
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Create order and MoonPay payment URL
  const createMoonPayPayment = async () => {
    setCheckoutLoading(true);
    setError('');

    try {
      if (!publicKey) {
        throw new Error('Please connect your wallet first');
      }

      // First create the order
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingAddress: fulfillmentType === 'SHIPPING' ? {
            name: shippingForm.name,
            line1: shippingForm.line1,
            line2: shippingForm.line2 || undefined,
            city: shippingForm.city,
            state: shippingForm.state,
            postalCode: shippingForm.postalCode,
            country: shippingForm.country,
            phone: shippingForm.phone || undefined,
          } : undefined,
          email: shippingForm.email,
          currency: 'USDC', // Base currency for MoonPay
          fulfillmentType,
          pickupNotes: fulfillmentType === 'LOCAL_PICKUP' ? pickupNotes : undefined,
        }),
      });

      const orderData = await res.json();

      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const orderId = orderData.orders[0].id;
      setMoonpayOrderId(orderId);

      // Get platform wallet address (for crypto payments)
      const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET || DEFAULT_PLATFORM_WALLET;

      // Create MoonPay payment URL
      const moonpayRes = await fetch('/api/moonpay/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': publicKey.toBase58(),
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          paymentMethod: moonpayPaymentType,
          walletAddress: moonpayPaymentType !== 'debit_card' ? platformWallet : undefined,
        }),
      });

      const moonpayData = await moonpayRes.json();

      if (!moonpayRes.ok) {
        throw new Error(moonpayData.error || 'Failed to create MoonPay payment');
      }

      // Store MoonPay URL and open in new window/iframe
      setMoonpayUrl(moonpayData.url);
      
      // Open MoonPay widget in new window
      window.open(moonpayData.url, 'moonpay', 'width=500,height=700,scrollbars=yes');
      
      // Also store widget config for potential embedded widget later
      // For now, we'll use the redirect approach

    } catch (err: any) {
      console.error('MoonPay payment creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create MoonPay payment');
      showError(err instanceof Error ? err.message : 'Failed to create MoonPay payment');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Not logged in
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect to Checkout</h1>
          <p className="text-gray-400 mb-8">
            Please connect your wallet to view your cart and checkout.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Connect Wallet
          </button>
          <Link href="/" className="block mt-4 text-gray-500 hover:text-gray-300">
            ← Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Empty cart - only show after cart has been fetched
  if (cartFetched && cartItems.length === 0 && step === 'cart') {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Your cart is empty</h1>
          <p className="text-gray-400 mb-8">
            Looks like you haven't added any items yet.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Success page
  if (step === 'success' && orderResult) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Order Confirmed!</h1>
          <p className="text-gray-400 mb-6">
            Thank you for your order. We've sent a confirmation to {shippingForm.email}
          </p>
          
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6 text-left">
            {orderResult.orders.map((order: any) => (
              <div key={order.id} className="mb-4 last:mb-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Order Number</span>
                  <span className="text-white font-mono">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white">
                        {orderResult.currency === 'USDC'
                          ? `$${order.subtotal.toFixed(2)} USDC`
                          : `${order.subtotal.toFixed(4)} SOL`
                        }
                      </span>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-700 mt-4 pt-4">
              <div className="flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className={`font-bold ${orderResult.currency === 'USDC' ? 'text-green-400' : 'text-blue-400'}`}>
                  {orderResult.currency === 'USDC'
                    ? `$${orderResult.totalAmount.toFixed(2)} USDC`
                    : `${orderResult.totalAmount.toFixed(4)} SOL`
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/account/orders"
              className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              View My Orders
            </Link>
            <Link
              href="/"
              className="block w-full py-3 bg-[#1f2937] hover:bg-[#374151] text-white font-semibold rounded-xl transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-bold text-white">flaunt.lol</span>
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4">
          {['cart', 'shipping', 'payment'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-blue-600 text-white' : 
                ['cart', 'shipping', 'payment'].indexOf(step) > i ? 'bg-green-600 text-white' :
                'bg-gray-700 text-gray-400'
              }`}>
                {['cart', 'shipping', 'payment'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={`hidden sm:inline text-sm capitalize ${step === s ? 'text-white' : 'text-gray-400'}`}>
                {s}
              </span>
              {i < 2 && <div className="w-8 sm:w-16 h-px bg-gray-700" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Cart Step */}
            {step === 'cart' && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-white">Your Cart ({cartItems.length})</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {cartItems.map((item) => {
                    const price = item.variant?.priceSol ?? item.product.priceSol;
                    const maxStock = item.variant?.quantity ?? item.product.quantity;
                    
                    return (
                      <div key={item.id} className="p-6 flex gap-4">
                        <img
                          src={item.product.images[0] || '/placeholder.png'}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <Link href={`/product/${item.product.slug}`} className="text-white font-medium hover:text-blue-400">
                            {item.product.name}
                          </Link>
                          {item.variant && (
                            <p className="text-sm text-gray-400">{item.variant.name}</p>
                          )}
                          <p className="text-sm text-gray-500">{item.product.store.name}</p>
                          <p className="text-blue-400 font-semibold mt-1">
                            ${(item.product.priceUsdc || price * 200).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={updating === item.id}
                            className="p-1 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={updating === item.id || item.quantity <= 1}
                              className="w-8 h-8 flex items-center justify-center bg-[#1f2937] rounded-lg text-white disabled:opacity-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={updating === item.id || item.quantity >= maxStock}
                              className="w-8 h-8 flex items-center justify-center bg-[#1f2937] rounded-lg text-white disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fulfillment Selection Step */}
            {step === 'fulfillment' && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-white">Delivery Method</h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-gray-400 text-sm mb-4">
                    All items in your cart support local pickup. How would you like to receive your order?
                  </p>

                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('SHIPPING')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        fulfillmentType === 'SHIPPING'
                          ? 'border-blue-500/50 bg-blue-900/20'
                          : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Truck className="w-8 h-8 text-blue-400" />
                        <div>
                          <div className="font-medium text-white">Ship to me</div>
                          <div className="text-sm text-gray-400">Receive your order via shipping carrier</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentType('LOCAL_PICKUP')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        fulfillmentType === 'LOCAL_PICKUP'
                          ? 'border-green-500/50 bg-green-900/20'
                          : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-400 text-lg">📍</span>
                        </div>
                        <div>
                          <div className="font-medium text-white">Local pickup</div>
                          <div className="text-sm text-gray-400">Pick up from the seller directly</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {fulfillmentType === 'LOCAL_PICKUP' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Your Email (for order confirmation)
                        </label>
                        <input
                          type="email"
                          value={shippingForm.email}
                          onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Message for Seller (optional)
                        </label>
                        <textarea
                          rows={3}
                          value={pickupNotes}
                          onChange={(e) => setPickupNotes(e.target.value)}
                          placeholder="Let the seller know your availability or preferred meeting location..."
                          className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                        />
                      </div>
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-xs text-green-400">
                          After payment, you'll be able to message the seller to coordinate pickup details.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setStep('cart')}
                      className="px-6 py-3 text-gray-300 hover:text-white"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => fulfillmentType === 'LOCAL_PICKUP' ? setStep('payment') : setStep('shipping')}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                    >
                      {fulfillmentType === 'LOCAL_PICKUP' ? 'Continue to Payment' : 'Continue to Shipping'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Step */}
            {step === 'shipping' && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-white">Shipping Address</h2>
                </div>
                <form onSubmit={handleShippingSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.name}
                        onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email (Optional)</label>
                      <input
                        type="email"
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-xs text-yellow-400">
                          ⚠️ <strong>All orders are non-refundable.</strong> Email is used to send you tracking information and order updates. Without an email, you won't receive shipping notifications.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={shippingForm.phone}
                        onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 1 *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.line1}
                        onChange={(e) => setShippingForm({ ...shippingForm, line1: e.target.value })}
                        placeholder="Street address"
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 2</label>
                      <input
                        type="text"
                        value={shippingForm.line2}
                        onChange={(e) => setShippingForm({ ...shippingForm, line2: e.target.value })}
                        placeholder="Apt, suite, etc. (optional)"
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.city}
                        onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.state}
                        onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.postalCode}
                        onChange={(e) => setShippingForm({ ...shippingForm, postalCode: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Country *</label>
                      <input
                        type="text"
                        required
                        value={shippingForm.country}
                        onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1f2937] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep('cart')}
                      className="px-6 py-3 text-gray-300 hover:text-white"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-lg font-semibold text-white">Payment</h2>
                </div>
                <div className="p-6">
                  {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 mb-6">
                      <AlertCircle className="w-5 h-5" />
                      {error}
                    </div>
                  )}

                  <div className="bg-[#1f2937] rounded-xl p-6 mb-6">
                    {fulfillmentType === 'SHIPPING' ? (
                      <>
                        <h3 className="text-white font-medium mb-4">Ship to:</h3>
                        <p className="text-gray-400">
                          {shippingForm.name}<br />
                          {shippingForm.line1}<br />
                          {shippingForm.line2 && <>{shippingForm.line2}<br /></>}
                          {shippingForm.city}, {shippingForm.state} {shippingForm.postalCode}<br />
                          {shippingForm.country}
                        </p>
                        <button
                          onClick={() => setStep('shipping')}
                          className="text-blue-400 text-sm mt-2 hover:underline"
                        >
                          Edit address
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                          <span className="text-green-400">📍</span> Local Pickup
                        </h3>
                        <p className="text-gray-400">
                          You'll coordinate pickup details with the seller after payment.
                        </p>
                        {pickupNotes && (
                          <div className="mt-3 p-3 bg-[#111827] rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Your message to seller:</p>
                            <p className="text-sm text-gray-300">{pickupNotes}</p>
                          </div>
                        )}
                        <button
                          onClick={() => setStep('fulfillment')}
                          className="text-green-400 text-sm mt-2 hover:underline"
                        >
                          Change delivery method
                        </button>
                      </>
                    )}
                  </div>

                  {/* Payment Currency Toggle */}
                  <div className="mb-6">
                    <h3 className="text-white font-medium mb-3">Pay with</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentCurrency('USDC')}
                        disabled={!!pendingOrder}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          paymentCurrency === 'USDC'
                            ? 'border-green-500/50 bg-green-900/20'
                            : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                        } ${pendingOrder ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">$</span>
                          </div>
                          <div>
                            <div className="font-medium text-white">USDC</div>
                            <div className="text-sm text-gray-400">${totalUsdc.toFixed(2)}</div>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentCurrency('SOL')}
                        disabled={!!pendingOrder}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          paymentCurrency === 'SOL'
                            ? 'border-purple-500/50 bg-purple-900/20'
                            : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                        } ${pendingOrder ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">◎</span>
                          </div>
                          <div>
                            <div className="font-medium text-white">SOL</div>
                            <div className="text-sm text-gray-400">{priceLoading ? '...' : `${(totalUsdc / solPrice).toFixed(4)} SOL`}</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Toggle */}
                  <div className="mb-6">
                    <h3 className="text-white font-medium mb-3">Payment Method</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('connected'); setPendingOrder(null); setManualTxSignature(''); setMoonpayUrl(null); }}
                        disabled={!!pendingOrder || !!moonpayUrl}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          paymentMethod === 'connected'
                            ? 'border-pink-400/50 bg-pink-900/20'
                            : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                        } ${pendingOrder || moonpayUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Wallet className="w-6 h-6 text-pink-300" />
                          <div>
                            <div className="font-medium text-white">Direct Wallet</div>
                            <div className="text-xs text-gray-400">Solana only</div>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('external'); setPendingOrder(null); setManualTxSignature(''); setMoonpayUrl(null); }}
                        disabled={!!pendingOrder || !!moonpayUrl}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          paymentMethod === 'external'
                            ? 'border-pink-400/50 bg-pink-900/20'
                            : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                        } ${pendingOrder || moonpayUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <ExternalLink className="w-6 h-6 text-pink-300" />
                          <div>
                            <div className="font-medium text-white">External Wallet</div>
                            <div className="text-xs text-gray-400">Manual payment</div>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('moonpay'); setPendingOrder(null); setManualTxSignature(''); setMoonpayUrl(null); }}
                        disabled={!!pendingOrder || !!moonpayUrl}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          paymentMethod === 'moonpay'
                            ? 'border-blue-400/50 bg-blue-900/20'
                            : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                        } ${pendingOrder || moonpayUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-6 h-6 text-blue-300" />
                          <div>
                            <div className="font-medium text-white">MoonPay</div>
                            <div className="text-xs text-gray-400">Card or crypto</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* MoonPay Payment Type Selector */}
                  {paymentMethod === 'moonpay' && (
                    <div className="mb-6">
                      <h3 className="text-white font-medium mb-3">Payment Type</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                          type="button"
                          onClick={() => setMoonpayPaymentType('debit_card')}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            moonpayPaymentType === 'debit_card'
                              ? 'border-blue-500/50 bg-blue-900/20'
                              : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                          }`}
                        >
                          <CreditCard className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                          <div className="text-xs font-medium text-white">Debit Card</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoonpayPaymentType('solana')}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            moonpayPaymentType === 'solana'
                              ? 'border-purple-500/50 bg-purple-900/20'
                              : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                          }`}
                        >
                          <div className="text-xl mb-1">◎</div>
                          <div className="text-xs font-medium text-white">Solana</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoonpayPaymentType('ethereum')}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            moonpayPaymentType === 'ethereum'
                              ? 'border-cyan-500/50 bg-cyan-900/20'
                              : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                          }`}
                        >
                          <div className="text-xl mb-1">Ξ</div>
                          <div className="text-xs font-medium text-white">Ethereum</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoonpayPaymentType('usdt')}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            moonpayPaymentType === 'usdt'
                              ? 'border-green-500/50 bg-green-900/20'
                              : 'border-gray-700 bg-[#1f2937] hover:border-gray-600'
                          }`}
                        >
                          <div className="text-xs font-medium text-white mb-1">$</div>
                          <div className="text-xs font-medium text-white">USDT</div>
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        {moonpayPaymentType === 'debit_card' 
                          ? 'Pay with credit or debit card - MoonPay handles conversion to crypto automatically.'
                          : `Pay with ${moonpayPaymentType.toUpperCase()} - MoonPay will send ${moonpayPaymentType === 'solana' ? 'SOL' : moonpayPaymentType === 'ethereum' ? 'ETH' : 'USDT'} to the platform wallet.`
                        }
                      </p>
                    </div>
                  )}

                  {/* Connected Wallet Payment */}
                  {paymentMethod === 'connected' && (
                    <div className={`rounded-xl p-6 mb-6 ${
                      paymentCurrency === 'USDC'
                        ? 'bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20'
                        : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20'
                    }`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          paymentCurrency === 'USDC'
                            ? 'bg-gradient-to-br from-green-500 to-teal-600'
                            : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                        }`}>
                          <span className="text-white font-bold">{paymentCurrency === 'USDC' ? '$' : '◎'}</span>
                        </div>
                        <div>
                          <h3 className="text-white font-medium">
                            Pay with {paymentCurrency === 'USDC' ? 'USD Coin (USDC)' : 'Solana (SOL)'}
                          </h3>
                          <p className="text-sm text-gray-400">Fast, secure blockchain payment</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">
                        You'll be prompted to approve the transaction in your connected wallet.
                      </p>

                      <div className="bg-[#0a0e1a] rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Amount to Pay:</p>
                        <code className={`text-lg font-mono ${paymentCurrency === 'USDC' ? 'text-green-400' : 'text-purple-400'}`}>
                          {paymentCurrency === 'USDC'
                            ? `$${totalUsdc.toFixed(2)} USDC`
                            : `${(totalUsdc / solPrice).toFixed(4)} SOL`
                          }
                        </code>
                        {paymentCurrency === 'SOL' && (
                          <p className="text-xs text-gray-500 mt-1">≈ ${totalUsdc.toFixed(2)} USD</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MoonPay Payment */}
                  {paymentMethod === 'moonpay' && (
                    <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Pay with MoonPay</h3>
                          <p className="text-sm text-gray-400">
                            {moonpayPaymentType === 'debit_card' 
                              ? 'Pay with credit or debit card'
                              : `Pay with ${moonpayPaymentType === 'solana' ? 'Solana (SOL)' : moonpayPaymentType === 'ethereum' ? 'Ethereum (ETH)' : 'USDT'}`
                            }
                          </p>
                        </div>
                      </div>

                      {!moonpayUrl ? (
                        <>
                          <p className="text-sm text-gray-400 mb-4">
                            MoonPay supports multiple payment methods. {moonpayPaymentType === 'debit_card' 
                              ? 'You can pay with a credit or debit card, and MoonPay will automatically convert it to crypto for the merchant.'
                              : `You can buy ${moonpayPaymentType === 'solana' ? 'SOL' : moonpayPaymentType === 'ethereum' ? 'ETH' : 'USDT'} with a credit/debit card or send from your existing wallet.`
                            }
                          </p>
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                            <p className="text-xs text-blue-400">
                              <strong>Amount:</strong> ${totalUsdc.toFixed(2)} {moonpayPaymentType === 'debit_card' ? 'USD' : `(${moonpayPaymentType === 'solana' ? (totalUsdc / solPrice).toFixed(4) + ' SOL' : moonpayPaymentType === 'ethereum' ? (totalUsdc / 3000).toFixed(4) + ' ETH' : totalUsdc.toFixed(2) + ' USDT'})`}
                            </p>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                            <p className="text-xs text-yellow-400">
                              <strong>Note:</strong> MoonPay will open in a new window. Complete your payment there, and you'll be redirected back when done.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <p className="text-sm text-green-400 font-medium mb-1">Payment Window Opened</p>
                            <p className="text-xs text-gray-400">
                              Complete your payment in the MoonPay window. If it didn't open, 
                              <button
                                onClick={() => window.open(moonpayUrl, 'moonpay', 'width=500,height=700,scrollbars=yes')}
                                className="text-blue-400 hover:underline ml-1"
                              >
                                click here
                              </button>
                            </p>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-xs text-blue-400">
                              <strong>Order ID:</strong> {moonpayOrderId}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              We'll process your order automatically once MoonPay confirms your payment.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* External Wallet Payment */}
                  {paymentMethod === 'external' && (
                    <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-500 to-yellow-600">
                          <ExternalLink className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Pay from External Wallet</h3>
                          <p className="text-sm text-gray-400">Ledger, Phantom mobile, exchange, etc.</p>
                        </div>
                      </div>

                      {!pendingOrder ? (
                        <>
                          <p className="text-sm text-gray-400 mb-4">
                            Click "Generate Payment Details" to create your order and get the payment information including the required memo.
                          </p>
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                            <p className="text-xs text-yellow-400">
                              <strong>Important:</strong> You must include the order number as a memo in your transaction. Without the correct memo, your payment cannot be matched to your order.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-3 mb-4">
                            {/* Order Number / Memo */}
                            <div className="bg-[#0a0e1a] rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Required Memo (Order Number):</p>
                              <div className="flex items-center gap-2">
                                <code className="text-lg font-mono text-orange-400 flex-1">
                                  {pendingOrder.orders[0].orderNumber}
                                </code>
                                <button
                                  type="button"
                                  onClick={copyMemo}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Copy memo"
                                >
                                  {copiedMemo ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-red-400 mt-2 font-medium">
                                YOU MUST include this memo in your transaction!
                              </p>
                            </div>

                            {/* Payment Amount */}
                            <div className="bg-[#0a0e1a] rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Minimum Amount to Send:</p>
                              <div className="flex items-center gap-2">
                                <code className="text-lg font-mono flex-1 text-green-400">
                                  ${totalUsdc.toFixed(2)} USDC
                                </code>
                                <button
                                  type="button"
                                  onClick={copyPaymentAmount}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Copy amount"
                                >
                                  {copiedAmount ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-red-400 mt-2 font-medium">
                                Underpayments will NOT be processed and refunds are NOT available.
                              </p>
                            </div>

                            {/* QR Code for wallet address */}
                            <div className="bg-[#0a0e1a] rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-2">Scan to get wallet address:</p>
                              <div className="flex justify-center">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${platformWallet}`}
                                  alt="Wallet QR Code"
                                  className="rounded-lg"
                                  width={150}
                                  height={150}
                                />
                              </div>
                            </div>

                            {/* Wallet Address */}
                            <div className="bg-[#0a0e1a] rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Send to Wallet Address:</p>
                              <div className="flex items-center gap-2">
                                <code className="text-sm text-gray-300 font-mono flex-1 break-all">
                                  {platformWallet}
                                </code>
                                <button
                                  type="button"
                                  onClick={copyWalletAddress}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                  title="Copy wallet address"
                                >
                                  {copiedWallet ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Transaction Signature Input */}
                            <div className="bg-[#0a0e1a] rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-2">Transaction Signature:</p>
                              <input
                                type="text"
                                value={manualTxSignature}
                                onChange={(e) => setManualTxSignature(e.target.value)}
                                placeholder="Paste your transaction signature here..."
                                className="w-full px-3 py-2 bg-[#1f2937] border border-gray-700 rounded-lg text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-orange-500"
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                After sending the payment, paste the transaction signature (tx hash) here.
                              </p>
                            </div>
                          </div>

                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                            <p className="text-xs text-yellow-400">
                              <strong>Warning:</strong> Payments below the minimum amount or without the correct memo will NOT be processed. Refunds are NOT available.
                            </p>
                          </div>

                          <p className="text-xs text-gray-500 mt-3">
                            Order expires in 5 minutes. Please complete your payment before then.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setStep('shipping');
                        setPendingOrder(null);
                        setManualTxSignature('');
                        setError('');
                      }}
                      className="px-6 py-3 text-gray-300 hover:text-white"
                    >
                      ← Back
                    </button>

                    {paymentMethod === 'connected' && (
                      <button
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className={`flex-1 py-3 ${
                          paymentCurrency === 'USDC'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-purple-600 hover:bg-purple-700'
                        } disabled:bg-gray-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2`}
                      >
                        {checkoutLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Wallet className="w-5 h-5" />
                            {paymentCurrency === 'USDC'
                              ? `Pay $${totalUsdc.toFixed(2)} USDC`
                              : `Pay ${(totalUsdc / solPrice).toFixed(4)} SOL`
                            }
                          </>
                        )}
                      </button>
                    )}

                    {paymentMethod === 'external' && !pendingOrder && (
                      <button
                        onClick={createOrderForExternalPayment}
                        disabled={checkoutLoading}
                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {checkoutLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating Order...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-5 h-5" />
                            Generate Payment Details
                          </>
                        )}
                      </button>
                    )}

                    {paymentMethod === 'external' && pendingOrder && (
                      <button
                        onClick={verifyExternalPayment}
                        disabled={verifyingPayment || !manualTxSignature.trim()}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {verifyingPayment ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Verifying Payment...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Verify Payment
                          </>
                        )}
                      </button>
                    )}

                    {paymentMethod === 'moonpay' && !moonpayUrl && (
                      <button
                        onClick={createMoonPayPayment}
                        disabled={checkoutLoading}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {checkoutLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating Payment...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            {moonpayPaymentType === 'debit_card' 
                              ? 'Pay with Card'
                              : `Buy ${moonpayPaymentType === 'solana' ? 'SOL' : moonpayPaymentType === 'ethereum' ? 'ETH' : 'USDT'}`
                            }
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#111827] border border-gray-800 rounded-xl sticky top-4">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">Order Summary</h2>
              </div>
              <div className="p-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 mb-4">
                    <img
                      src={item.product.images[0] || '/placeholder.png'}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm text-white">${item.itemTotalUsdc.toFixed(2)}</p>
                  </div>
                ))}

                <div className="border-t border-gray-700 pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">${totalUsdc.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Shipping</span>
                    <span className="text-green-400">Included</span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-start">
                    <span className="text-white font-semibold">Total</span>
                    <div className="text-right">
                      <span className="font-bold text-lg text-green-400">
                        ${totalUsdc.toFixed(2)} USDC
                      </span>
                      <p className="text-sm text-gray-400 mt-1">
                        or <span className="text-purple-400 font-medium">{priceLoading ? '...' : `${(totalUsdc / solPrice).toFixed(4)} SOL`}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {step === 'cart' && (
                  <button
                    onClick={() => setStep(allSupportPickup ? 'fulfillment' : 'shipping')}
                    className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Continue to Checkout
                  </button>
                )}

                {step === 'fulfillment' && (
                  <button
                    onClick={() => fulfillmentType === 'LOCAL_PICKUP' ? setStep('payment') : setStep('shipping')}
                    className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    {fulfillmentType === 'LOCAL_PICKUP' ? 'Continue to Payment' : 'Continue to Shipping'}
                  </button>
                )}

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Shield className="w-4 h-4" />
                    Secure checkout
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Truck className="w-4 h-4" />
                    Shipping included in price
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
