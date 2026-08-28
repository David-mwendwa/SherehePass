import { db } from '@/lib/db';
import { markOrderPaid, releaseOrder } from '@/lib/purchase';

/**
 * Payments.
 *
 * This is a portfolio build and no money moves. Rather than pretend otherwise,
 * the gateway is an explicit simulator with the same *shape* as the real thing:
 * a request that returns a gateway reference immediately, and a callback that
 * arrives separately and decides the outcome. The application code around it —
 * pending orders, stock held during payment, idempotent confirmation, release
 * on failure — is exactly what a live Daraja or Stripe integration needs, so
 * swapping the simulator for a real client is a change to this file and
 * nothing else.
 *
 * What is deliberately NOT faked: the order is not marked PAID by the same
 * function that starts the payment. Every real gateway confirms out of band,
 * and code that collapses those two steps has to be rewritten to go live.
 */

const SIMULATED_DELAY_MS = 2500;

/**
 * How often a simulated payment fails.
 *
 * One in eight by default, because a demo where payment always succeeds never
 * exercises the release path — putting unpaid tickets back on sale — and that
 * is the half that actually goes wrong in production.
 *
 * Configurable so a scripted run can turn it off: `PAYMENT_FAILURE_RATE=0`
 * makes the end-to-end journey deterministic without weakening the default.
 */
const FAILURE_RATE = Number(process.env.PAYMENT_FAILURE_RATE ?? 0.125);

/** Whether a real gateway is configured. Neither is, in this build. */
export function gatewayMode() {
  return process.env.MPESA_CONSUMER_KEY || process.env.STRIPE_SECRET_KEY
    ? 'live'
    : 'simulated';
}

/**
 * Starts a payment.
 *
 * For M-Pesa this is where an STK push would go out; for a card, where a
 * PaymentIntent would be created. Both return quickly with a reference and
 * settle later.
 */
export async function requestPayment({ order, method, phone }) {
  const gatewayRef =
    method === 'MPESA'
      ? `ws_CO_${Date.now()}${Math.floor(Math.random() * 1000)}`
      : `pi_sim_${Date.now()}`;

  await db.order.update({
    where: { id: order.id },
    data: { gatewayRef },
  });

  // In simulated mode the callback is scheduled here instead of arriving from
  // outside. Deliberately not awaited: the checkout response must not block on
  // it, exactly as it would not block on a real callback.
  if (gatewayMode() === 'simulated') {
    scheduleSimulatedCallback(order.id, gatewayRef);
  }

  return { gatewayRef };
}

/** Stands in for the gateway's webhook. */
function scheduleSimulatedCallback(orderId, gatewayRef) {
  setTimeout(async () => {
    try {
      const succeeded = Math.random() >= FAILURE_RATE;
      if (succeeded) {
        await markOrderPaid(orderId, { gatewayRef });
      } else {
        await releaseOrder(orderId, 'FAILED');
      }
    } catch (error) {
      // A failed callback must not take the process down: this runs detached
      // from any request, so there is nobody to return the error to.
      console.error('[payments] simulated callback failed', error);
    }
  }, SIMULATED_DELAY_MS);
}
