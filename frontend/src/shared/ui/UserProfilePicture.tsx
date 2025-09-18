import React from 'react';

import User from '@/assets/svg/user.svg?react';
import { getFileUrl } from '../utils/api';

export interface UserProfilePictureProps {
  thumbnail?: string | null;
  localPreview?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UserProfilePicture: React.FC<UserProfilePictureProps> = ({
  thumbnail,
  localPreview,
  onChange,
}) => {
  const src = React.useMemo(() => {
    if (localPreview) {
      return localPreview;
    }

    if (!thumbnail) {
      return '';
    }

    const [rawPath, ...queryParts] = thumbnail.split('?');
    const cacheBuster = queryParts.length ? `?${queryParts.join('?')}` : '';
    const path = rawPath.trim();

    if (!path) {
      return '';
    }

    return `${getFileUrl(path)}${cacheBuster}`;
  }, [localPreview, thumbnail]);

  return (
    <div className="form-group thumbnail-group">
      <label htmlFor="thumbnail">Profile picture</label>
      <label htmlFor="thumbnail" className="thumbnail-label">
        {src ? (
          <img src={src} alt="Profile Thumbnail" className="profile-thumbnail" />
        ) : (
          <User className="thumbnail-placeholder" />
        )}
        <input
          type="file"
          id="thumbnail"
          className="thumbnail-input"
          onChange={onChange}
        />
      </label>
    </div>
  );
};

export default UserProfilePicture;


