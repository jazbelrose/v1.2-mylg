import React from 'react';
import SVGThumbnail from '../../features/dashboard/components/SvgThumbnail';

interface ProjectAvatarProps {
  thumb?: string;
  name?: string;
  initial?: string;
  className?: string;
}

const ProjectAvatar: React.FC<ProjectAvatarProps> = ({
  thumb,
  name = '',
  initial = '',
  className = '',
}) =>
  thumb ? (
    <img src={thumb} alt={name} className={className} />
  ) : (
    <SVGThumbnail
      initial={(initial || name.charAt(0)).toUpperCase()}
      className={className}
    />
  );

export default ProjectAvatar;

