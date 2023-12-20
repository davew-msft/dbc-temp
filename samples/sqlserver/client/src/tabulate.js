import * as React from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { Grid, Typography, Accordion, AccordionSummary, AccordionDetails, List, ListItem } from '@mui/material';


const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: '#03a9f4',
      fontSize: 12,
      color: theme.palette.common.white,
      borderBottom: "none"
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 11,
      backgroundColor: '#eceff1',
      borderBottom: "none"
    },
  }));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
'&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
    border: 0,
},
// hide last border
'&:last-child td, &:last-child th': {
    border: 0,
},
}));


export function DatabaseSchema(props) {
  // console.log(props);

  const tables = props.schemas.table_snapshots;

  // const [expanded, setExpanded] = React.useState(Array(tables.length).fill(false));
  let numRefs = 0;
  tables.forEach(t => {
    numRefs += t.schema.foreign_keys.length;
  });

  let summary = `The ${props.schemas.db_type} database contains ${tables.length} tables with ${numRefs} reference relationships.`
  // if (tables.length < props.schemas.num_tables) {
  //   summary += tables.length.toLocaleString() + " of them are listed as follows:"
  // }
  // console.log(summary);

  return (
    <Grid container sx={{ width: '100%' }}>
      <Typography key={'summary'}>{summary}</Typography>
      <Grid sx={{ width: '100%' }}>
        {
          tables.map((t, i) => {
            return (
              <Accordion key = {i} sx={{ width: '100%' }}>
              <AccordionSummary aria-controls="panel1d-content" id="panel1d-header" >
              <Typography inline="true" variant="body2" fontSize={15}>
                {t.schema.name + ":  "}
              </Typography>
              <Typography inline="true" variant="body2" color="text.secondary" fontSize={15}>
                { 'columns = ' + t.schema.columns.length.toLocaleString()}
              </Typography>
              <Typography inline="true" variant="body2" color="text.secondary" fontSize={15}>
                { ',  rows = ' + t.schema.num_rows.toLocaleString() }
              </Typography>
              {
                t.schema.primary_key.length > 0 &&
                <Typography inline="true" variant="body2" color="text.secondary" fontSize={15}>
                { ',  PK = ' + t.schema.primary_key.join(', ')}
                </Typography>
              }
              </AccordionSummary>
              <AccordionDetails>
                <TableDataFrame key={i} columns={t.data_frame.columns} rows={t.data_frame.data} total_rows={t.data_frame.data.length} />
                {
                  t.schema.foreign_keys &&
                  <List>
                    {
                      t.schema.foreign_keys.map((x, iii) => {
                        const [col, fk_table, fk_col] = x;
                        return (
                          <ListItem key={iii}>
                            <Typography inline="true" key={1} variant="body2">{col}</Typography>
                            <Typography inline="true" key={2} variant="body2" color="text.secondary">{' references foreign key '}</Typography>
                            <Typography inline="true" key={3} variant="body2">{fk_table + '(' + fk_col + ')'}</Typography>
                          </ListItem>
                        )
                      })
                    }
                  </List>
                }
              </AccordionDetails>
            </Accordion>
            )
          })
        }
      </Grid>
    </Grid>
  );
}

export function TableDataFrame(props) {
    const formatCell = (cell) => {
        if (typeof cell === 'number') {
            return cell.toLocaleString();
        }

        return cell;
    }
    const createColumns = (row) => {
        
        return row.map((c, idx) => {
            return {
                id: idx,
                label: formatCell(c),
                align: "center"
            }
        })
    }

    const columns = createColumns(props.columns);
    const rows = props.rows.map(x => x.map(c => formatCell(c)));

    let caption = null;
    if (rows.length < props.total_rows) {
        caption = `${rows.length} of ${props.total_rows} result rows are displayed due to space limit`;
    }

    return RenderTable(columns, rows, caption);
}

function RenderTable(columns, rows, caption_str) {
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer >
            <Table stickyHeader sx={{ }} size="small" aria-label="sticky table">
              {
                caption_str &&
                <caption>{caption_str}</caption>
              }
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <StyledTableCell
                      key={column.id}
                      align={column.align}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      {column.label}
                    </StyledTableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, i) => {
                    return (
                      <StyledTableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {columns.map((column, i) => {
                          const value = row[i];
                          return (
                            <StyledTableCell key={column.id} align={column.align}> {value} </StyledTableCell>
                          );
                        })}
                      </StyledTableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
          {
            rows.length > 10 &&
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          }
          
        </Paper>
    );
}
