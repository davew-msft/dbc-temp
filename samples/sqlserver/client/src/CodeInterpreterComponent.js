import * as React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { RichText } from '@chatui/core';
import { TableDataFrame } from './tabulate';
import Plot from 'react-plotly.js';
import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';

function CodeInterpreterComponent(props) {
    const code_md = props.code_md
    const code_html = props.code_html
    const result = props.result
    const finished = props.finished
    const status = result ? (result.data ? ['success', 'Completed (click for more info)']: finished ? ['error', 'Failed (click for more info)'] : ['warning', 'ReQuerying ... (click for more info)']) : ['info', 'Running ... (click for more info)']

    return (
        <div>
            <ExecutionPanel
                status = {status[1]}
                color = {status[0]}
                code = {code_html}
                result = {code_md.includes('```python') ? '' : result?.data}
            >
            </ExecutionPanel>
            {
                result && code_md.includes('```python') && !code_md.includes('```python_data_analysis') && result.data &&
                (
                  result.data.constructor === Array ?
                  result.data.map((item, i) => <Plot
                    data={item.data}
                    layout={{...item.layout, width: 600}}
                  />)
                  :
                  <Plot
                    data={result.data.data}
                    layout={{...result.data.layout, width: 600}}
                  />
                )
            }
        </div>
    )
}

function ExecutionPanel(props) {
    const status = props.status
    const color = props.color
    const code = props.code
    const result = props.result
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
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
          variant="contained"
          aria-expanded={open ? 'true' : undefined}
          color={color}
          sx={{ ml: 2, my: 1, display: 'block' }}
          onClick={handleClick}
        >
          {status}
          <ExpandMoreIcon />
        </Button>
        <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
          PaperProps={{style: {maxWidth: 600, maxHeight: 600, padding: 10}}}
        >
            <RichText content = {code} />
            {
                result && result.columns &&
                <TableDataFrame columns={result.columns} rows={result.data} total_rows={result.data.length} />
            }
        </Menu>
      </div>
    );
  }

export default CodeInterpreterComponent;