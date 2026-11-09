const apiKey = process.env.FAVORIT_API_KEY?.trim() || '00000000-0000-0000-0000-000000000001';
const apiUrl = process.env.FAVORIT_API_URL || 'https://api.favorit-parts.ru/hs/hsprice/';

const apiErrors = {
  'Empty key!': 'Сервис не получил ключ покупателя.',
  'Invalid key client!': 'Сервис отклонил ключ покупателя. Проверьте FAVORIT_API_KEY.',
  'Empty number goods!': 'Сервис не получил артикул детали.',
  'Request quota exceeded!': 'Лимит запросов к сервису исчерпан.',
};

function getOffers(goods, kind) {
  return goods.filter((part) => part.brand).flatMap((part) => {
    const item = { kind, name: part.name, brand: part.brand, number: part.number };
    const warehouses = part.warehouses ?? [];

    if (warehouses.length === 0) {
      return [{ ...item, warehouse: null, price: null, stock: 0 }];
    }

    return warehouses.map((warehouse) => ({
      ...item,
      warehouse: warehouse.code || null,
      price: warehouse.price,
      stock: warehouse.stock,
    }));
  });
}

export async function searchParts(req, res) {
  res.set('Cache-Control', 'no-store');
  const { number, brand } = req.query;
  if (typeof number !== 'string' || !number.trim() ||
      (brand !== undefined && (typeof brand !== 'string' || !brand.trim()))) {
    return res.status(400).json({ error: 'Укажите артикул и, для поиска аналогов, производителя.' });
  }

  const url = new URL(apiUrl);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('number', number.trim());
  if (brand) {
    url.searchParams.set('brand', brand);
    url.searchParams.set('analogues', 'on');
  }

  const signal = AbortSignal.timeout(12000);
  let response;
  try {
    response = await fetch(url, { signal, redirect: 'error' });
  } catch {
    const error = signal.aborted
      ? 'Сервис запчастей не ответил вовремя.'
      : 'Не удалось подключиться к сервису запчастей.';
    return res.status(signal.aborted ? 504 : 502).json({ error });
  }

  try {
    const data = await response.json();
    if (data?.error) {
      const errors = Object.entries(apiErrors)
        .filter(([message]) => String(data.error).includes(message))
        .map(([, message]) => message);
      return res.status(502).json({
        error: errors.join(' ') || 'Сервис запчастей вернул ошибку.',
      });
    }
    if (!response.ok || !Array.isArray(data?.goods)) {
      throw new Error('Invalid parts response');
    }

    if (!brand) {
      const brands = [...new Set(data.goods.map((part) => part.brand).filter(Boolean))];
      return res.json(brands);
    }

    const originals = getOffers(data.goods, 'original');
    const analogues = getOffers(data.goods.flatMap((part) => part.analogues ?? []), 'analogue');
    return res.json([...originals, ...analogues]);
  } catch {
    if (signal.aborted) {
      return res.status(504).json({ error: 'Сервис запчастей не ответил вовремя.' });
    }
    return res.status(502).json({ error: 'Сервис запчастей вернул некорректный ответ.' });
  }
}
