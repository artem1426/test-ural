import { configureStore } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const partsApi = createApi({
  reducerPath: 'partsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  refetchOnMountOrArgChange: true,
  endpoints: (build) => ({
    getBrands: build.query({
      query: (number) => ({ url: 'parts', params: { number } }),
    }),
    getOffers: build.query({
      query: (params) => ({ url: 'parts', params }),
    }),
  }),
});

export const { useGetBrandsQuery, useGetOffersQuery } = partsApi;

export const store = configureStore({
  reducer: { [partsApi.reducerPath]: partsApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(partsApi.middleware),
});
