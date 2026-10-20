import { httpsCallable } from 'firebase/functions';

import { functions } from '@/src/config/firebase';

export interface RegisterStudentInput {
  email: string;
  password: string;
  username: string;
  phone: string;
  registerNumber: string;
  departmentId: string;
  year: string;
  section: string;
}

export interface RegisterStudentResult {
  uid: string;
  email: string;
  username: string;
}

export interface SetupUsernameResult {
  uid: string;
  username: string;
}

const registerStudentCallable = httpsCallable<RegisterStudentInput, RegisterStudentResult>(
  functions,
  'registerStudent'
);

const setupUsernameCallable = httpsCallable<{ username: string }, SetupUsernameResult>(
  functions,
  'setupUsername'
);

function mapCallableError(error: unknown): Error {
  const code = (error as { code?: string }).code ?? '';
  const message = (error as { message?: string }).message ?? 'Something went wrong.';

  if (code === 'functions/already-exists') {
    return new Error(message);
  }
  if (code === 'functions/invalid-argument') {
    return new Error(message);
  }
  if (code === 'functions/failed-precondition') {
    return new Error(message);
  }
  if (code === 'functions/not-found') {
    return new Error(message);
  }

  return new Error(message.replace(/^FirebaseError:\s*/i, ''));
}

export async function registerStudentAccount(
  input: RegisterStudentInput
): Promise<RegisterStudentResult> {
  try {
    const result = await registerStudentCallable(input);
    return result.data;
  } catch (error) {
    throw mapCallableError(error);
  }
}

export async function setupUsernameAccount(username: string): Promise<SetupUsernameResult> {
  try {
    const result = await setupUsernameCallable({ username });
    return result.data;
  } catch (error) {
    throw mapCallableError(error);
  }
}
