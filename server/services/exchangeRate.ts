import { desc, eq } from 'drizzle-orm';
import { db } from '../../src/db/index.ts';
import { exchangeRates } from '../../src/db/schema.ts';

export async function getActiveUsdKesRate(): Promise<{
  id: number;
  rate: number;
  source: string;
  createdAt: Date;
}> {
  try {
    const latest = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.isActive, true))
      .orderBy(desc(exchangeRates.createdAt))
      .limit(1);

    if (latest[0]) {
      return {
        id: latest[0].id,
        rate: Number(latest[0].rate),
        source: latest[0].source,
        createdAt: latest[0].createdAt,
      };
    }

    const fallback = await db
      .insert(exchangeRates)
      .values({
        baseCurrency: 'USD',
        quoteCurrency: 'KES',
        rate: '129.5000',
        source: 'manual',
        notes: 'Initial default Kenya USD/KES benchmark rate',
        isActive: true,
      })
      .returning();

    return {
      id: fallback[0].id,
      rate: Number(fallback[0].rate),
      source: fallback[0].source,
      createdAt: fallback[0].createdAt,
    };
  } catch (error) {
    console.error('Exchange rate lookup failed:', error);
    throw new Error('Unable to retrieve USD/KES exchange rate.', { cause: error });
  }
}

export async function refreshLiveUsdKesRate(actorUserId?: number): Promise<{
  id: number;
  rate: number;
  source: string;
  createdAt: Date;
}> {
  const feedUrl = process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD';
  try {
    const parsedUrl = new URL(feedUrl);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('Unsupported exchange rate feed protocol');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(parsedUrl.toString(), { signal: controller.signal });
    clearTimeout(timer);

    if (!resp.ok) {
      throw new Error(`Feed HTTP ${resp.status}`);
    }

    const data = (await resp.json()) as { rates?: { KES?: number } };
    const kesRate = Number(data?.rates?.KES);
    if (!Number.isFinite(kesRate) || kesRate < 50 || kesRate > 500) {
      throw new Error('Invalid KES rate returned from feed');
    }

    await db.update(exchangeRates).set({ isActive: false }).where(eq(exchangeRates.isActive, true));

    const inserted = await db
      .insert(exchangeRates)
      .values({
        baseCurrency: 'USD',
        quoteCurrency: 'KES',
        rate: kesRate.toFixed(4),
        source: 'api',
        notes: `Live USD/KES rate fetched from ${parsedUrl.hostname}`,
        isActive: true,
        recordedByUserId: actorUserId ?? null,
      })
      .returning();

    return {
      id: inserted[0].id,
      rate: Number(inserted[0].rate),
      source: inserted[0].source,
      createdAt: inserted[0].createdAt,
    };
  } catch (error) {
    console.warn('Live exchange rate fetch fell back to latest stored rate:', error);
    return getActiveUsdKesRate();
  }
}

export async function setManualUsdKesRate(
  rate: number,
  notes: string,
  actorUserId: number
): Promise<{ id: number; rate: number; source: string; createdAt: Date }> {
  await db.update(exchangeRates).set({ isActive: false }).where(eq(exchangeRates.isActive, true));
  const inserted = await db
    .insert(exchangeRates)
    .values({
      baseCurrency: 'USD',
      quoteCurrency: 'KES',
      rate: rate.toFixed(4),
      source: 'manual',
      notes: notes || 'Administrator manual USD/KES rate update',
      isActive: true,
      recordedByUserId: actorUserId,
    })
    .returning();

  return {
    id: inserted[0].id,
    rate: Number(inserted[0].rate),
    source: inserted[0].source,
    createdAt: inserted[0].createdAt,
  };
}
