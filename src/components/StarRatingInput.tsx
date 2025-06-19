'use client'

import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { Star, StarBorder } from '@mui/icons-material'

interface StarRatingInputProps {
  currentRating?: number | null    // Current rating value
  onRatingChange: (rating: number) => void  // Callback when rating changes
  disabled?: boolean               // Disable interaction
  size?: 'small' | 'medium' | 'large'
  label?: string                  // Optional label
  showClearButton?: boolean       // Show option to clear rating
  allowHalfStars?: boolean        // Allow half-star ratings (future enhancement)
}

export default function StarRatingInput({
  currentRating,
  onRatingChange,
  disabled = false,
  size = 'medium',
  label,
  showClearButton = true,
  allowHalfStars = false
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  
  // Size configurations
  const sizeConfig = {
    small: { starSize: 20, fontSize: '0.875rem', gap: 0.25 },
    medium: { starSize: 28, fontSize: '1rem', gap: 0.5 },
    large: { starSize: 36, fontSize: '1.125rem', gap: 0.75 }
  }
  
  const config = sizeConfig[size]
  
  // Determine which rating to display (hover takes precedence)
  const displayRating = hoverRating ?? currentRating ?? 0

  const handleStarClick = (rating: number) => {
    if (disabled) return
    
    // If clicking the same rating, clear it (if clear button is enabled)
    if (showClearButton && currentRating === rating) {
      onRatingChange(0)
    } else {
      onRatingChange(rating)
    }
  }

  const handleStarHover = (rating: number) => {
    if (disabled) return
    setHoverRating(rating)
  }

  const handleMouseLeave = () => {
    setHoverRating(null)
  }

  const handleClearRating = () => {
    if (disabled) return
    onRatingChange(0)
  }

  // Render individual star
  const renderStar = (starNumber: number) => {
    const isActive = displayRating >= starNumber
    const isHovered = hoverRating !== null && hoverRating >= starNumber
    
    return (
      <Box
        key={starNumber}
        sx={{
          cursor: disabled ? 'default' : 'pointer',
          transition: 'transform 0.1s ease',
          '&:hover': {
            transform: disabled ? 'none' : 'scale(1.1)'
          }
        }}
        onClick={() => handleStarClick(starNumber)}
        onMouseEnter={() => handleStarHover(starNumber)}
      >
        {isActive ? (
          <Star
            sx={{
              fontSize: config.starSize,
              color: isHovered ? 'warning.dark' : 'warning.main',
              filter: isHovered ? 'brightness(1.1)' : 'none'
            }}
          />
        ) : (
          <StarBorder
            sx={{
              fontSize: config.starSize,
              color: isHovered ? 'warning.main' : 'action.disabled',
              transition: 'color 0.2s ease'
            }}
          />
        )}
      </Box>
    )
  }

  return (
    <Box>
      {/* Label */}
      {label && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 1, fontSize: config.fontSize }}
        >
          {label}
        </Typography>
      )}
      
      {/* Star input area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: config.gap,
          opacity: disabled ? 0.6 : 1
        }}
        onMouseLeave={handleMouseLeave}
      >
        {/* Five stars */}
        <Box sx={{ display: 'flex', gap: config.gap }}>
          {[1, 2, 3, 4, 5].map(starNumber => renderStar(starNumber))}
        </Box>
        
        {/* Current rating display */}
        {displayRating > 0 && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              ml: 1, 
              fontSize: config.fontSize,
              minWidth: '2em'
            }}
          >
            {displayRating}/5
          </Typography>
        )}
        
        {/* Clear button */}
        {showClearButton && currentRating && currentRating > 0 && !disabled && (
          <Typography
            variant="caption"
            sx={{
              ml: 1,
              cursor: 'pointer',
              color: 'text.secondary',
              textDecoration: 'underline',
              fontSize: config.fontSize,
              '&:hover': {
                color: 'primary.main'
              }
            }}
            onClick={handleClearRating}
          >
            Clear
          </Typography>
        )}
      </Box>
      
      {/* Helper text */}
      {!disabled && (
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ mt: 0.5, display: 'block', fontSize: config.fontSize }}
        >
          {hoverRating ? `Rate ${hoverRating} star${hoverRating !== 1 ? 's' : ''}` : 'Click to rate'}
        </Typography>
      )}
    </Box>
  )
}