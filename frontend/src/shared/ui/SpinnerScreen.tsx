import React from 'react';
import Spinner from './Spinner';

const SpinnerScreen: React.FC = () => (
  <div
    className="dashboard-wrapper welcome-screen"
    style={{ height: 'var(--viewport-dvh, 100dvh)' }}
  >
    <Spinner />
  </div>
);

export default SpinnerScreen;








