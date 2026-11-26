import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface LiveEvent {
  id: string;
  type: string;
  message: string;
  status?: string;
  at: string;
}

interface UiState {
  sidebarOpen: boolean;
  socketConnected: boolean;
  liveEvents: LiveEvent[];
}

const initialState: UiState = {
  sidebarOpen: false,
  socketConnected: false,
  liveEvents: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebar(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setSocketConnected(state, action: PayloadAction<boolean>) {
      state.socketConnected = action.payload;
    },
    pushLiveEvent(state, action: PayloadAction<LiveEvent>) {
      state.liveEvents = [action.payload, ...state.liveEvents].slice(0, 10);
    },
  },
});

export const { setSidebar, setSocketConnected, pushLiveEvent } = uiSlice.actions;
export default uiSlice.reducer;
