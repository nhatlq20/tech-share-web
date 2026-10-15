import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './context/AuthContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import { NotificationProvider } from './components/notifications/NotificationProvider.jsx';
import { InAppNotificationBanner } from './components/chat/InAppNotificationBanner.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <NotificationProvider>
              <InAppNotificationBanner />
              <AppRoutes />
            </NotificationProvider>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}
