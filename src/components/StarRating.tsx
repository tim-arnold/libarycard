'use client'

import { Box, Typography, Chip } from '@mui/material'
import { Star, StarBorder, StarHalf } from '@mui/icons-material'

interface StarRatingProps {
  userRating?: number | null       // Current user's rating (1-5)
  averageRating?: number | null    // Location average rating
  ratingCount?: number             // Number of ratings
  size?: 'small' | 'medium' | 'large'
  showCount?: boolean             // Show rating count
  showAverage?: boolean           // Show average rating alongside user rating
  variant?: 'display' | 'chip' | 'mini'  // Different display modes for space efficiency
  onClick?: () => void            // Click handler for rating interaction
  className?: string
}

export default function StarRating({
  userRating,
  averageRating,
  ratingCount = 0,
  size = 'small',
  showCount = false,
  showAverage = false,
  variant = 'display',
  onClick,
  className
}: StarRatingProps) {
  // Only show rating if there's an actual rating - no empty stars
  const hasAnyRating = (userRating && userRating > 0) || (averageRating && averageRating > 0)
  
  if (!hasAnyRating) {
    return null
  }
  
  // Determine which rating to display based on availability
  const displayRating = userRating ?? averageRating ?? 0
  const hasUserRating = userRating !== null && userRating !== undefined && userRating > 0
  
  // Size configurations for different variants
  const sizeConfig = {
    small: { starSize: 14, fontSize: '0.75rem', chipHeight: 20 },
    medium: { starSize: 18, fontSize: '0.875rem', chipHeight: 24 },
    large: { starSize: 24, fontSize: '1rem', chipHeight: 32 }
  }
  
  const config = sizeConfig[size]

  // Render individual star icon
  const renderStar = (index: number, rating: number) => {
    const starValue = index + 1
    let StarIcon = StarBorder
    
    if (rating >= starValue) {
      StarIcon = Star
    } else if (rating >= starValue - 0.5) {
      StarIcon = StarHalf
    }
    
    return (
      <StarIcon
        key={index}
        sx={{
          fontSize: config.starSize,
          color: rating >= starValue - 0.4 ? 'warning.main' : 'action.disabled',
          transition: 'color 0.2s ease'
        }}
      />
    )
  }

  // Chip variant - ultra compact for list views
  if (variant === 'chip') {
    if (!displayRating) return null
    
    return (
      <Chip
        icon={<Star sx={{ fontSize: `${config.starSize - 2}px !important` }} />}
        label={`${displayRating.toFixed(1)}${showCount && ratingCount > 0 ? ` (${ratingCount})` : ''}`}
        size={size === 'large' ? 'medium' : size as 'small' | 'medium'}
        color={hasUserRating ? 'primary' : 'default'}
        variant={hasUserRating ? 'filled' : 'outlined'}
        sx={{
          height: config.chipHeight,
          fontSize: config.fontSize,
          cursor: onClick ? 'pointer' : 'default',
          '& .MuiChip-icon': {
            color: 'warning.main'
          }
        }}
        onClick={onClick}
        className={className}
      />
    )
  }

  // Mini variant - single star + rating for ultra-compact spaces
  if (variant === 'mini') {
    if (!displayRating) return null
    
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.25,
          cursor: onClick ? 'pointer' : 'default'
        }}
        onClick={onClick}
        className={className}
      >
        <Star sx={{ fontSize: config.starSize, color: 'warning.main' }} />
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: config.fontSize,
            fontWeight: hasUserRating ? 600 : 400,
            color: hasUserRating ? 'primary.main' : 'text.secondary'
          }}
        >
          {displayRating.toFixed(1)}
        </Typography>
        {showCount && ratingCount > 0 && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: config.fontSize }}
          >
            ({ratingCount})
          </Typography>
        )}
      </Box>
    )
  }

  // Default display variant - shows all 5 stars
  if (!displayRating && !showAverage) return null

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
      className={className}
    >
      {/* Star display */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {[0, 1, 2, 3, 4].map(index => renderStar(index, displayRating))}
      </Box>
      
      {/* Rating text and count */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {displayRating > 0 && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: config.fontSize,
              fontWeight: hasUserRating ? 600 : 400,
              color: hasUserRating ? 'primary.main' : 'text.secondary'
            }}
          >
            {displayRating.toFixed(1)}
          </Typography>
        )}
        
        {/* Show both user and average rating if both exist and showAverage is true */}
        {showAverage && hasUserRating && averageRating && averageRating !== userRating && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: config.fontSize }}
          >
            (avg: {averageRating.toFixed(1)})
          </Typography>
        )}
        
        {/* Rating count */}
        {showCount && ratingCount > 0 && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: config.fontSize }}
          >
            ({ratingCount})
          </Typography>
        )}
      </Box>
    </Box>
  )
}