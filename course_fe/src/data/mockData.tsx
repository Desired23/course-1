// Mock data for instructor payouts and earnings

export const mockData = {
  // Instructor payouts
  payouts: [
    {
      id: 'PAY-2024-001',
      instructor_id: 1,
      amount: 15000000,
      status: 'paid' as const,
      request_date: '2024-01-01',
      processed_date: '2024-01-05',
      payment_method: 'Bank Transfer',
      bank_details: {
        bank_name: 'Vietcombank',
        account_number: '0123456789',
        account_name: 'Nguyen Van A'
      },
      period: 'December 2023',
      earnings_count: 45,
      courses_count: 3,
      notes: 'Regular monthly payout',
      admin_notes: 'Processed successfully',
      processed_by: 1
    },
    {
      id: 'PAY-2024-002',
      instructor_id: 1,
      amount: 18500000,
      status: 'approved' as const,
      request_date: '2024-02-01',
      processed_date: null,
      payment_method: 'Bank Transfer',
      bank_details: {
        bank_name: 'Vietcombank',
        account_number: '0123456789',
        account_name: 'Nguyen Van A'
      },
      period: 'January 2024',
      earnings_count: 52,
      courses_count: 3,
      notes: null,
      admin_notes: 'Approved, pending transfer',
      processed_by: 1
    },
    {
      id: 'PAY-2024-003',
      instructor_id: 1,
      amount: 12000000,
      status: 'pending' as const,
      request_date: '2024-03-01',
      processed_date: null,
      payment_method: 'Bank Transfer',
      bank_details: {
        bank_name: 'Vietcombank',
        account_number: '0123456789',
        account_name: 'Nguyen Van A'
      },
      period: 'February 2024',
      earnings_count: 38,
      courses_count: 3,
      notes: 'Awaiting admin review',
      admin_notes: null,
      processed_by: null
    }
  ],

  // Payout methods
  payoutMethods: [
    {
      id: 'PM-001',
      type: 'bank' as const,
      bank_name: 'Vietcombank',
      account_number: '0123456789',
      account_name: 'Nguyen Van A',
      is_default: true,
      status: 'verified' as const,
      created_at: '2023-01-15'
    },
    {
      id: 'PM-002',
      type: 'paypal' as const,
      email: 'instructor@example.com',
      is_default: false,
      status: 'verified' as const,
      created_at: '2023-03-20'
    },
    {
      id: 'PM-003',
      type: 'bank' as const,
      bank_name: 'Techcombank',
      account_number: '9876543210',
      account_name: 'Nguyen Van A',
      is_default: false,
      status: 'pending' as const,
      created_at: '2024-01-10'
    }
  ],

  // Instructor earnings
  instructorEarnings: [
    {
      earning_id: 1,
      course: {
        course_id: 1,
        title: 'Web Development Bootcamp',
        thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200'
      },
      student: {
        user_id: 101,
        name: 'Tran Thi B'
      },
      amount: 500000,
      commission_rate: 0.3,
      net_amount: 350000,
      status: 'available' as const,
      earning_date: '2024-03-15',
      payout_id: null,
      payment_id: 1001
    },
    {
      earning_id: 2,
      course: {
        course_id: 1,
        title: 'Web Development Bootcamp',
        thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200'
      },
      student: {
        user_id: 102,
        name: 'Le Van C'
      },
      amount: 500000,
      commission_rate: 0.3,
      net_amount: 350000,
      status: 'available' as const,
      earning_date: '2024-03-16',
      payout_id: null,
      payment_id: 1002
    },
    {
      earning_id: 3,
      course: {
        course_id: 2,
        title: 'Python for Beginners',
        thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=200'
      },
      student: {
        user_id: 103,
        name: 'Pham Thi D'
      },
      amount: 400000,
      commission_rate: 0.3,
      net_amount: 280000,
      status: 'available' as const,
      earning_date: '2024-03-17',
      payout_id: null,
      payment_id: 1003
    },
    {
      earning_id: 4,
      course: {
        course_id: 1,
        title: 'Web Development Bootcamp',
        thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200'
      },
      student: {
        user_id: 104,
        name: 'Nguyen Van E'
      },
      amount: 500000,
      commission_rate: 0.3,
      net_amount: 350000,
      status: 'locked' as const,
      earning_date: '2024-03-18',
      payout_id: null,
      payment_id: 1004
    },
    {
      earning_id: 5,
      course: {
        course_id: 3,
        title: 'Data Science Masterclass',
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200'
      },
      student: {
        user_id: 105,
        name: 'Hoang Thi F'
      },
      amount: 600000,
      commission_rate: 0.3,
      net_amount: 420000,
      status: 'locked' as const,
      earning_date: '2024-03-19',
      payout_id: null,
      payment_id: 1005
    },
    {
      earning_id: 6,
      course: {
        course_id: 1,
        title: 'Web Development Bootcamp',
        thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200'
      },
      student: {
        user_id: 106,
        name: 'Vo Van G'
      },
      amount: 500000,
      commission_rate: 0.3,
      net_amount: 350000,
      status: 'paid' as const,
      earning_date: '2024-02-15',
      payout_id: 'PAY-2024-002',
      payment_id: 1006
    },
    {
      earning_id: 7,
      course: {
        course_id: 2,
        title: 'Python for Beginners',
        thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=200'
      },
      student: {
        user_id: 107,
        name: 'Dang Thi H'
      },
      amount: 400000,
      commission_rate: 0.3,
      net_amount: 280000,
      status: 'paid' as const,
      earning_date: '2024-02-16',
      payout_id: 'PAY-2024-002',
      payment_id: 1007
    },
    {
      earning_id: 8,
      course: {
        course_id: 1,
        title: 'Web Development Bootcamp',
        thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200'
      },
      student: {
        user_id: 108,
        name: 'Bui Van I'
      },
      amount: 500000,
      commission_rate: 0.3,
      net_amount: 350000,
      status: 'available' as const,
      earning_date: '2024-03-20',
      payout_id: null,
      payment_id: 1008
    },
    {
      earning_id: 9,
      course: {
        course_id: 3,
        title: 'Data Science Masterclass',
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200'
      },
      student: {
        user_id: 109,
        name: 'Ly Thi K'
      },
      amount: 600000,
      commission_rate: 0.3,
      net_amount: 420000,
      status: 'available' as const,
      earning_date: '2024-03-21',
      payout_id: null,
      payment_id: 1009
    },
    {
      earning_id: 10,
      course: {
        course_id: 2,
        title: 'Python for Beginners',
        thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=200'
      },
      student: {
        user_id: 110,
        name: 'Do Van L'
      },
      amount: 400000,
      commission_rate: 0.3,
      net_amount: 280000,
      status: 'available' as const,
      earning_date: '2024-03-22',
      payout_id: null,
      payment_id: 1010
    }
  ]
}
