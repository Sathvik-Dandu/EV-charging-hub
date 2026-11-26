import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../app/store';
import { loggedIn } from '../features/authSlice';
import { authApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { loginSchema, type LoginForm } from '../schemas/forms';
import { canOpen } from '../config/navigation';
import AuthShell from './AuthShell';
import PasswordField from '../components/common/PasswordField';

const HOME = '/dashboard';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requested = (useLocation().state as { from?: string } | null)?.from;
  const user = useAppSelector((s) => s.auth.user);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  if (user) return <Navigate to={HOME} replace />;

  const onSubmit = async (values: LoginForm) => {
    setError('');
    try {
      const auth = await authApi.login(values);
      queryClient.clear();
      dispatch(loggedIn(auth));
      const target = requested && canOpen(auth.user.role, requested) ? requested : HOME;
      navigate(target, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in with your email and password.">
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" autoComplete="email" {...register('email')} error={!!formState.errors.email} helperText={formState.errors.email?.message} />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            {...register('password')}
            error={!!formState.errors.password}
            helperText={formState.errors.password?.message}
          />
          <Button type="submit" variant="contained" size="large" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Box>
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }} color="text.secondary">
        New here?{' '}
        <Link component={RouterLink} to="/register" sx={{ fontWeight: 700 }}>
          Sign up
        </Link>
      </Typography>
    </AuthShell>
  );
}
