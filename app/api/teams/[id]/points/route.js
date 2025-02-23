import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '../../../../../lib/mongodb';
import Team from '../../../../../models/Team';
import { getIO } from '../../../../../lib/socket';

export async function PUT(request, context) {
  try {
    const session = await getServerSession();
    
    // Check if user is admin
    if (!session?.user?.role === 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { points } = await request.json();
    const teamId = context.params.id; // Correct way to access route params in Next.js 13+

    if (points < 0) {
      return NextResponse.json(
        { error: 'Points cannot be negative' },
        { status: 400 }
      );
    }

    const team = await Team.findByIdAndUpdate(
      teamId,
      { points },
      { new: true }
    );

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Get updated teams list
    const updatedTeams = await Team.find({}).sort({ points: -1 });

    try {
      // Try to emit update via socket
      const io = getIO();
      if (io) {
        io.emit('teamsUpdate', updatedTeams);
      }
    } catch (socketError) {
      console.error('Socket error:', socketError);
      // Continue with the response even if socket fails
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error updating points:', error);
    return NextResponse.json(
      { error: 'Error updating points' },
      { status: 500 }
    );
  }
} 