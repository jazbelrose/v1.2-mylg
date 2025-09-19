import React from 'react';
import SVGThumbnail from '../../dashboard/home/components/SvgThumbnail';
import { getFileUrl } from '../utils/api';
import Squircle from './Squircle';
import './project-avatar.css';

interface ProjectAvatarProps {
  thumb?: string;
  name?: string;
  initial?: string;
  className?: string;
  radius?: number;
}

const DEFAULT_RADIUS = 10;

const ProjectAvatar: React.FC<ProjectAvatarProps> = ({
  thumb,
  name = '',
  initial = '',
  className = '',
  radius = DEFAULT_RADIUS,
}) => {
  const wrapperClassName = ['project-avatar', className].filter(Boolean).join(' ').trim() || undefined;
  const displayInitial = (initial || name.charAt(0)).toUpperCase() || '#';

  return (
    <Squircle as="span" className={wrapperClassName} radius={radius} aria-hidden={!name && !initial}>
      {thumb ? (
        <img
          src={getFileUrl(thumb)}
          alt={name}
          className="project-avatar__media"
        />
      ) : (
        <SVGThumbnail
          initial={displayInitial}
          className="project-avatar__media"
        />
      )}
    </Squircle>
  );
};

export default ProjectAvatar;















