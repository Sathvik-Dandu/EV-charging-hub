import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Link, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useAppDispatch } from '../app/store';
import { loggedIn } from '../features/authSlice';
import { authApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { registerSchema, type RegisterForm } from '../schemas/forms';
import PasswordField from '../components/common/PasswordField';
import PhoneField from '../components/common/PhoneField';
import AuthShell from './AuthShell';

type SignupRole = RegisterForm['role'];

const ROLE_TABS: { value: SignupRole; label: string; intro: string }[] = [
  { value: 'EV_OWNER', label: 'EV driver', intro: 'Book chargers, charge and pay per kWh. Your account is ready immediately.' },
  { value: 'STATION_OWNER', label: 'Station owner', intro: 'List your charging stations and run on-site sessions. An administrator reviews your request first.' },
  { value: 'TECHNICIAN', label: 'Technician', intro: 'Fix charger faults assigned by the operations manager. An administrator reviews your request first.' },
];

const isSignupRole = (value: string | null): value is SignupRole => ROLE_TABS.some((t) => t.value === value);

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const initialRole = isSignupRole(params.get('role')) ? (params.get('role') as SignupRole) : 'EV_OWNER';
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const { register, handleSubmit, setValue, control, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '', role: initialRole, organization: '' },
  });
  const { errors } = formState;
  const [role, password] = useWatch({ control, name: ['role', 'password'] });
  const tab = ROLE_TABS.find((t) => t.value === role)!;

  const onSubmit = async ({ confirmPassword: _, phone, organization, ...values }: RegisterForm) => {
    setError('');
    try {
      const res = await authApi.register({ ...values, phone: phone || undefined, organization: organization || undefined });
      if ('pending' in res) {
        setPending(res.message);
        return;
      }
      queryClient.clear();
      dispatch(loggedIn(res));
      navigate('/vehicles', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (pending) {
    return (
      <AuthShell title="Request sent" subtitle={`Thanks for signing up as a ${tab.label.toLowerCase()}.`}>
        <Alert severity="success">{pending}</Alert>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          If you try to sign in before approval you will see "waiting for administrator approval".
        </Typography>
        <Button component={RouterLink} to="/login" variant="contained" size="large" fullWidth sx={{ mt: 3 }}>
          Go to sign in
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign up" subtitle="Choose the type of account you need.">
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={role}
        onChange={(_, value: SignupRole | null) => value && setValue('role', value, { shouldValidate: true })}
        sx={{ mb: 1.5, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, borderRadius: 999 } }}
        aria-label="Account type"
      >
        {ROLE_TABS.map((t) => (
          <ToggleButton key={t.value} value={t.value}>
            {t.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {tab.intro}
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Full name" {...register('fullName')} error={!!errors.fullName} helperText={errors.fullName?.message} />
          {role !== 'EV_OWNER' && (
            <TextField
              label={role === 'STATION_OWNER' ? 'Business name' : 'Service company (optional)'}
              {...register('organization')}
              error={!!errors.organization}
              helperText={errors.organization?.message}
            />
          )}
          <TextField label="Email" autoComplete="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          <PhoneField label="Mobile number (optional)" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            {...register('password', { deps: ['confirmPassword'] })}
            rulesFor={password ?? ''}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={formState.isSubmitting}>
            {role === 'EV_OWNER' ? 'Create account' : 'Send request'}
          </Button>
        </Stack>
      </Box>
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }} color="text.secondary">
        Already have an account?{' '}
        <Link component={RouterLink} to="/login" sx={{ fontWeight: 700 }}>
          Sign in
        </Link>
      </Typography>
    </AuthShell>
  );
}
