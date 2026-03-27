import { Request, Response } from 'express';

export async function createTicket(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'createTicket handler placeholder' });
}

export async function getRecentTickets(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'getRecentTickets handler placeholder' });
}
