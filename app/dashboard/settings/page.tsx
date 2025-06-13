import {
  Card,
  Title,
  Input,
  Button,
  Switch,
} from '@reactbits/core';
import { useState } from 'react';

const SettingsPage = () => {
  const [profile, setProfile] = useState({
    name: 'Jane Doe',
    email: 'jane@irelandpay.com',
    notifications: true,
  });

  const handleSave = () => {
    console.log('Saved profile settings:', profile);
  };

  return (
    <div className="p-6 grid gap-6">
      <Card>
        <Title level={3}>User Settings</Title>
        <div className="grid gap-4 mt-4">
          <Input
            label="Full Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <Input
            label="Email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={profile.notifications}
              onChange={(value) => setProfile({ ...profile, notifications: value })}
            />
            <span>Enable Email Notifications</span>
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
