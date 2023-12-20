import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import TableViewSharpIcon from '@mui/icons-material/TableViewSharp';
import CloudCircleIcon from '@mui/icons-material/CloudCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';

function NavBar(props) {
  const sampleDbOptions = props.sampleDbOptions
  const setSource = props.setSource
  const handlePartialRefresh = props.handlePartialRefresh

  return (
    <AppBar position="static">
      <Container maxWidth={false}>
        <Toolbar disableGutters>
          <TableViewSharpIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} fontSize={'large'} />
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'system-ui',
              fontWeight: 900,
              letterSpacing: '.0rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            DBCopilot
          </Typography>
          
          <Typography
            variant="h5"
            noWrap
            component="a"
            href=""
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            LOGO
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            <SampleDBMenu
              sampleDbOptions = {sampleDbOptions}
              setSource = {setSource}
            />
          </Box>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }}}>
            <NavItem
              displayName = {'Refresh'}
              icon = {<RefreshIcon />}
              onClick = {handlePartialRefresh}
            />
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}


function SampleDBMenu(props) {
  const sampleDbOptions = props.sampleDbOptions
  const setSource = props.setSource

  return (
    <BaseListMenu
      displayName = {'Select Database'}
      icon = {<CloudCircleIcon />}
      options = {sampleDbOptions}
      optionClickedCallback = {setSource}
      showSelected = {false}
    >
    </BaseListMenu>
  )
}

function NavItem(props) {
  const displayName = props.displayName
  const icon = props.icon
  const onClick = props.onClick

  return (
    <div>
      <Button
        id="basic-button"
        sx={{ ml: 2, my: 2, color: 'white', display: 'block' }}
        onClick={onClick}
      >
        {displayName}
        {icon}
      </Button>
    </div>
  )
}

function BaseListMenu(props) {
  const displayName = props.displayName
  const icon = props.icon
  const options = props.options
  const showSelected = props.showSelected ?? true
  const optionClickedCallback = props.optionClickedCallback ?? ((option) => {})

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuItemClick = (event, index) => {
    setSelectedIndex(index);
    setAnchorEl(null);
    optionClickedCallback(options[index])
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <Button
        id="basic-button"
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{ ml: 2, my: 2, color: 'white', display: 'block' }}
        onClick={handleClick}
      >
        {displayName}
        {icon}
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        {options.map((option, index) => (
          <MenuItem
            key={option}
            selected={showSelected && index === selectedIndex}
            onClick={(event) => handleMenuItemClick(event, index)}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

export default NavBar;