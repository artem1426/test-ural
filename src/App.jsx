import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useGetBrandsQuery, useGetOffersQuery } from './store.js';

const priceFormat = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const offersPerPage = 6;

function Loading({ children }) {
  return (
    <p className="query-status text-body-secondary" role="status">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      {children}
    </p>
  );
}

function QueryError({ error, retry }) {
  return (
    <div className="alert alert-danger query-error" role="alert">
      <span>{error.data?.error ?? 'Не удалось выполнить запрос. Проверьте подключение.'}</span>
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={retry}>
        Повторить
      </button>
    </div>
  );
}

function OffersTable({ offers }) {
  return (
    <table className="table offers-table align-middle mb-0">
      <thead>
        <tr>
          <th scope="col">Деталь и производитель</th>
          <th scope="col" className="offer-numeric text-end">Цена</th>
          <th scope="col" className="offer-numeric text-end">Остаток</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((offer, index) => (
          <tr key={index}>
            <td>
              <div className="fw-semibold">{offer.name || offer.number}</div>
              <div className="part-meta">
                <span>{offer.brand}</span>
                {offer.number && <span>{offer.number}</span>}
                <span className={`offer-kind offer-kind-${offer.kind}`}>
                  {offer.kind === 'original' ? 'Искомая деталь' : 'Аналог'}
                </span>
              </div>
            </td>
            <td className="offer-numeric text-end fw-semibold">
              {offer.price == null ? '—' : priceFormat.format(offer.price)}
            </td>
            <td className="offer-numeric text-end">
              {offer.stock} шт.
              {offer.warehouse && <div className="warehouse-name">Склад {offer.warehouse}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OffersPanel({ number, brand, query, page, onPageChange }) {
  const viewport = useRef(null);
  const rows = brand && query.isSuccess && !query.isFetching ? query.currentData : undefined;
  const total = rows?.length ?? 0;
  const pageCount = Math.ceil(total / offersPerPage);
  const currentPage = Math.min(page, pageCount || 1);
  const start = (currentPage - 1) * offersPerPage;
  const end = Math.min(start + offersPerPage, total);

  useLayoutEffect(() => {
    viewport.current.scrollTop = 0;
  }, [brand, currentPage]);

  return (
    <section className="panel results-panel" aria-labelledby="offers-heading">
      <header className="results-header">
        <h2 id="offers-heading">Предложения и аналоги</h2>
        <p className="results-context" title={brand || undefined}>
          {brand ? `${brand} · ${number}` : 'Цены и остатки по складам'}
        </p>
      </header>
      <div
        className="results-viewport"
        ref={viewport}
        role="region"
        aria-labelledby="offers-heading"
        tabIndex={total > 0 ? 0 : undefined}
      >
        {total > 0 ? (
          <OffersTable offers={rows.slice(start, end)} />
        ) : (
          <div className="results-message">
            {!brand && (
              <>
                <span className="empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M4 10h16m-11 0v9" />
                  </svg>
                </span>
                <p>Выберите производителя, чтобы увидеть предложения.</p>
              </>
            )}
            {brand && query.isFetching && <Loading>Ищем предложения и аналоги…</Loading>}
            {brand && query.isError && <QueryError error={query.error} retry={query.refetch} />}
            {rows?.length === 0 && <p role="status">Предложения и аналоги не найдены.</p>}
          </div>
        )}
      </div>
      <div className="results-footer">
        {total > 0 && (
          <p role="status">Показано <strong>{start + 1 === end ? end : `${start + 1}–${end}`}</strong> из {total}</p>
        )}
        {pageCount > 1 && (
          <nav className="page-controls" aria-label="Страницы предложений">
            <button
              type="button"
              className="btn btn-page"
              aria-label="Предыдущая страница"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              ‹
            </button>
            <span>{currentPage} / {pageCount}</span>
            <button
              type="button"
              className="btn btn-page"
              aria-label="Следующая страница"
              disabled={currentPage === pageCount}
              onClick={() => onPageChange(currentPage + 1)}
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [input, setInput] = useState('');
  const [number, setNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [page, setPage] = useState(1);
  const article = input.trim();
  const activeNumber = article === number ? number : '';

  useEffect(() => {
    if (article === number) return;
    const timer = setTimeout(() => setNumber(article), 400);
    return () => clearTimeout(timer);
  }, [article, number]);

  const brands = useGetBrandsQuery(activeNumber || skipToken);
  const offers = useGetOffersQuery(activeNumber && brand ? { number: activeNumber, brand } : skipToken);
  const manufacturers = brands.isSuccess && !brands.isFetching ? brands.currentData : undefined;

  function changeArticle(event) {
    const value = event.target.value;
    if (value.trim() !== article) setBrand('');
    setInput(value);
  }

  function submitSearch(event) {
    event.preventDefault();
    if (!article) return;
    if (article !== number) {
      setNumber(article);
    } else if (!brands.isFetching) {
      setBrand('');
      brands.refetch();
    }
  }

  function selectBrand(manufacturer) {
    setBrand(manufacturer);
    setPage(1);
  }

  return (
    <>
      <header className="site-header">
        <div className="page-width wordmark">
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
              <path d="m12 2.75 8 4.625v9.25l-8 4.625-8-4.625v-9.25L12 2.75Z" />
              <path d="m4 7.375 8 4.625 8-4.625M12 12v9.25M8 5.0625l8 4.625v3.75" />
            </svg>
          </span>
          Партномер
        </div>
      </header>

      <main className="page-width page-content">
        <div className="page-intro">
          <h1>Поиск автозапчастей</h1>
          <p>Введите артикул и выберите производителя, чтобы увидеть аналоги, цены и остатки.</p>
        </div>

        <div className="search-layout">
          <div className="search-sidebar">
            <section className="panel search-panel" aria-labelledby="article-heading">
              <div className="step-heading">
                <span className="step-number" aria-hidden="true">01</span>
                <h2 id="article-heading">Поиск по артикулу</h2>
              </div>
              <form onSubmit={submitSearch}>
                <label htmlFor="article" className="visually-hidden">Артикул детали</label>
                <input
                  id="article"
                  className="form-control article-input"
                  type="search"
                  value={input}
                  onChange={changeArticle}
                  placeholder="Например, 01089"
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>
            </section>

            <section className="panel search-panel brand-panel" aria-labelledby="brand-heading">
              <div className="step-heading">
                <span className="step-number" aria-hidden="true">02</span>
                <h2 id="brand-heading">Производитель</h2>
              </div>
              <div className="brand-viewport">
                {!activeNumber && <p className="text-body-secondary mb-0">Список появится после поиска по артикулу.</p>}
                {activeNumber && brands.isFetching && <Loading>Ищем производителей…</Loading>}
                {activeNumber && brands.isError && <QueryError error={brands.error} retry={brands.refetch} />}
                {manufacturers?.length === 0 && (
                  <p className="text-body-secondary mb-0" role="status">По этому артикулу ничего не найдено.</p>
                )}
                {manufacturers?.length > 0 && (
                  <fieldset className="brand-list">
                    <legend className="visually-hidden">Производители</legend>
                    {manufacturers.map((manufacturer) => (
                      <label className="brand-option" key={manufacturer}>
                        <input
                          type="radio"
                          name="brand"
                          checked={brand === manufacturer}
                          onChange={() => selectBrand(manufacturer)}
                        />
                        <span>{manufacturer}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </div>
            </section>
          </div>

          <OffersPanel number={activeNumber} brand={brand} query={offers} page={page} onPageChange={setPage} />
        </div>
      </main>

      <footer className="page-width site-footer">
        <details className="catalog-mark">
          <summary aria-label="Знак каталога">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1L12 2Z" />
            </svg>
          </summary>
          <span>Фаворит</span>
        </details>
      </footer>
    </>
  );
}
