import { configureStore, createSlice } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
// import { usersReducer } from './slices/usersSlice';
// import { albumsApi } from './apis/albumsApi';
// import { photosApi } from './apis/photosApi';

// === App State ===============================================================
//
// - translator state:
//  - target language
//  - api key
//  - character limit
//  - temperature
// - page states:
//  - untranslated
//  - requesting_translation
//  - translated
//    - // elements
//    - viewing state:
//      - translation
//      - original
//
// =============================================================================

console.log('GOT HERE');

// TODO: get defaults
const translatorInitialState = {
  targetLanguage: 'english',
  apiKey: '',
  characterLimit: 4000,
  temperature: 0.7
};

const PAGE_STATE_UNTRANSLATED = 'page-state-untranslated';
const PAGE_STATE_REQUESTING = 'page-state-requesting';
const PAGE_STATE_VIEWING_TRANSLATION = 'page-state-viewing-translation';
const PAGE_STATE_VIEWING_ORIGINAL = 'page-state-viewing-original';

const pageInitialState = {
  state: PAGE_STATE_UNTRANSLATED
};// end pageInitialState

const translatorSlice = createSlice({
  name: 'translator',
  initialState: translatorInitialState,
  reducers: {
    setTargetLanguage: (state, action) =>
    {
      state.targetLanguage = action.payload;
    },
    setApiKey: (state, action) =>
    {
      state.apiKey = action.payload;
    },
    setCharacterLimit: (state, action) =>
    {
      state.characterLimit = action.payload;
    },
    setTemperature: (state, action) =>
    {
      state.temperature = action.payload;
    }
  }
});// end translatorSlice

const pageStateSlice = createSlice({
  name: 'pageState',
  initialState: pageInitialState,
  reducers: {
    setUntranslated: (state) =>
    {
      state.state = PAGE_STATE_UNTRANSLATED;
    },
    setRequesting: (state) =>
    {
      state.state = PAGE_STATE_REQUESTING;
    },
    setViewingTranslation: (state) =>
    {
      state.state = PAGE_STATE_VIEWING_TRANSLATION;
    },
    setViewingOriginal: (state) =>
    {
      state.state = PAGE_STATE_VIEWING_ORIGINAL;
    }
  }
});// end pageStateSlice

const store = configureStore({
  reducer: {
    translator: translatorSlice.reducer,
    pageState: pageStateSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
  {
    return getDefaultMiddleware();
  }
});

setupListeners(store.dispatch);

export default store;
export const translatorMutator = translatorSlice.actions;
export const pageStateMutator = pageStateSlice.actions;
