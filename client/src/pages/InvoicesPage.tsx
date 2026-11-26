import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import CurrencyRupeeRounded from '@mui/icons-material/CurrencyRupeeRounded';
import PendingActionsRounded from '@mui/icons-material/PendingActionsRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import { useAppSelector } from '../app/store';
import { can } from '../config/permissions';
import { invoiceApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import type { Invoice } from '../api/types';
import { PAYMENT_METHODS } from '../schemas/forms';
import { dateTime, kwh, money } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import StatusChip from '../components/common/StatusChip';
import { useNotify } from '../components/common/Notifier';

export default function InvoicesPage() {
  const isOwner = can(useAppSelector((s) => s.auth.user!.role), 'invoices:pay');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: invoiceApi.list });
  const paid = invoices.filter((i) => i.paymentStatus === 'PAID');
  const pending = invoices.filter((i) => i.paymentStatus === 'PENDING');
  const sum = (list: Invoice[]) => list.reduce((s, i) => s + i.totalAmount, 0);

  const columns: GridColDef<Invoice>[] = [
    { field: 'invoiceNo', headerName: 'Invoice', width: 160, cellClassName: 'mono' },
    { field: 'createdAt', headerName: 'Date', width: 190, valueFormatter: (v) => dateTime(v) },
    { field: 'station', headerName: 'Station', flex: 1, minWidth: 180, valueGetter: (_, r) => r.session?.charger.station.name },
    { field: 'vehicle', headerName: 'Vehicle', width: 130, valueGetter: (_, r) => r.session?.vehicle.registrationNo },
    { field: 'energy', headerName: 'Energy', width: 110, valueGetter: (_, r) => r.session?.energyKwh ?? 0, valueFormatter: (v) => kwh(v) },
    { field: 'totalAmount', headerName: 'Amount', width: 130, valueFormatter: (v) => money(v) },
    { field: 'paymentStatus', headerName: 'Payment', width: 120, renderCell: ({ value }) => <StatusChip kind="payment" value={value} /> },
    {
      field: 'view',
      headerName: '',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <Button size="small" variant={row.paymentStatus === 'PENDING' && isOwner ? 'contained' : 'text'} onClick={() => setSelected(row)}>
          {row.paymentStatus === 'PENDING' && isOwner ? 'Pay' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Invoices" subtitle="Energy-based billing with peak-hour tariff, idle fee and GST" />
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Total billed" value={money(sum(invoices))} icon={<CurrencyRupeeRounded />} caption={`${invoices.length} invoices`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Paid" value={money(sum(paid))} icon={<TaskAltRounded />} caption={`${paid.length} invoices`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard title="Pending" value={money(sum(pending))} icon={<PendingActionsRounded />} caption={`${pending.length} invoices`} />
        </Grid>
      </Grid>
      <Card>
        <Box sx={{ height: 600 }}>
          <DataGrid rows={invoices} columns={columns} loading={isLoading} disableRowSelectionOnClick initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[10, 25, 50]} sx={{ border: 0 }} />
        </Box>
      </Card>
      <InvoiceDialog invoice={selected} canPay={isOwner} onClose={() => setSelected(null)} />
    </>
  );
}

function InvoiceDialog({ invoice, canPay, onClose }: { invoice: Invoice | null; canPay: boolean; onClose: () => void }) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<string>('UPI');
  const pay = useMutation({
    mutationFn: () => invoiceApi.pay(invoice!.id, method),
    onSuccess: (inv) => {
      notify(`Payment successful · ${inv.paymentRef}`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  });

  if (!invoice) return null;
  const s = invoice.session;
  const tariff = s?.charger.station.tariff;
  const line = (k: string, v: string, bold = false) => (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography color={bold ? 'text.primary' : 'text.secondary'} sx={{ fontWeight: bold ? 700 : 400 }}>
        {k}
      </Typography>
      <Typography sx={{ fontWeight: bold ? 800 : 600 }}>{v}</Typography>
    </Stack>
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        Invoice {invoice.invoiceNo}
        <Typography variant="body2" color="text.secondary">
          {dateTime(invoice.createdAt)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          {line('Station', s?.charger.station.name ?? '')}
          {line('Charger', s?.charger.code ?? '')}
          {line('Vehicle', s?.vehicle.registrationNo ?? '')}
          {s?.booking && line('Booking', s.booking.reference)}
          <Divider sx={{ my: 1 }} />
          {line(`Off-peak ${invoice.offPeakKwh} kWh × ${money(tariff?.energyRate ?? 0)}`, money(invoice.energyCost))}
          {line(`Peak ${invoice.peakKwh} kWh × ${money(tariff?.peakRate ?? 0)}`, money(invoice.peakCost))}
          {line(`Idle fee (${s?.idleMinutes ?? 0} min, 10 free)`, money(invoice.idleFee))}
          {line('GST 18%', money(invoice.taxAmount))}
          <Divider sx={{ my: 1 }} />
          {line('Total', money(invoice.totalAmount), true)}
          {invoice.paymentRef && line('Payment ref', invoice.paymentRef)}
          {canPay && invoice.paymentStatus === 'PENDING' && (
            <TextField select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} sx={{ mt: 2 }}>
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {canPay && invoice.paymentStatus === 'PENDING' && (
          <Button variant="contained" onClick={() => pay.mutate()} disabled={pay.isPending}>
            {pay.isPending ? 'Processing…' : `Pay ${money(invoice.totalAmount)}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
