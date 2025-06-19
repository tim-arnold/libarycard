'use client'

import {
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import {
  CheckBox,
  CheckBoxOutlineBlank,
} from '@mui/icons-material'
import { useBookSelection } from '@/contexts/BookSelectionContext'

interface SelectionModeToggleProps {
  variant?: 'compact' | 'expanded'
}

export default function SelectionModeToggle({ variant = 'expanded' }: SelectionModeToggleProps) {
  const { state, actions } = useBookSelection()
  const selectionCount = actions.getSelectionCount()

  const handleToggle = () => {
    actions.toggleSelectionMode()
  }

  if (variant === 'compact') {
    return (
      <ToggleButton
        value="selection"
        selected={state.isSelectionMode}
        onChange={handleToggle}
        size="small"
        sx={{ borderRadius: 2 }}
      >
        {state.isSelectionMode ? <CheckBox /> : <CheckBoxOutlineBlank />}
      </ToggleButton>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <ToggleButtonGroup
        value={state.isSelectionMode ? 'selection' : 'normal'}
        exclusive
        onChange={handleToggle}
        size="small"
        sx={{ height: 32 }}
      >
        <ToggleButton 
          value="normal"
          sx={{ px: 2, borderRadius: '16px 0 0 16px' }}
        >
          <CheckBoxOutlineBlank sx={{ mr: 0.5, fontSize: 16 }} />
          <Typography variant="caption">
            Add One
          </Typography>
        </ToggleButton>
        <ToggleButton 
          value="selection"
          sx={{ px: 2, borderRadius: '0 16px 16px 0' }}
        >
          <CheckBox sx={{ mr: 0.5, fontSize: 16 }} />
          <Typography variant="caption">
            Select Multiple
          </Typography>
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Selection count indicator */}
      {selectionCount > 0 && (
        <Chip
          label={`${selectionCount} selected`}
          size="small"
          color="primary"
          variant="outlined"
        />
      )}

      {/* Mode indicator text */}
      <Typography variant="caption" color="text.secondary">
        {state.isSelectionMode ? (
          <>Select multiple books to review and add together</>
        ) : (
          <>Click books to add one at a time</>
        )}
      </Typography>
    </Box>
  )
}