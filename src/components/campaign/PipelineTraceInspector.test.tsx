import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PipelineTraceInspector } from './PipelineTraceInspector';
import type { PipelineTrace } from '@/types';

const mockTrace: PipelineTrace = {
  traceId: 'trace_123',
  campaignId: 'camp_123',
  businessId: 'biz_123',
  createdAt: new Date().toISOString(),
  userRequest: {
    stepId: 'step_1',
    name: 'USER',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      request: 'Create a funny Telugu ad for our chicken biryani',
      language: 'te',
      style: 'funny',
      objective: 'promotion',
      targetProduct: 'Chicken Biryani',
    },
    summary: 'User request created',
  },
  mitraUi: {
    stepId: 'step_2',
    name: 'MITRA UI',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: { templateId: 'default', ctaSelection: 'order_whatsapp' },
  },
  intentExtraction: {
    stepId: 'step_3',
    name: 'Intent extraction',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      extractedLanguage: 'Telugu',
      extractedStyle: 'funny',
      extractedProduct: 'Chicken Biryani',
      extractedObjective: 'promotion',
      confidence: 0.98,
    },
  },
  businessBrainRetrieval: {
    stepId: 'step_4',
    name: 'Business Brain retrieval',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      business: 'ABC Biryani',
      location: 'Kondapur, Hyderabad',
      product: 'Chicken Biryani',
      price: '₹299',
      brandTone: 'friendly',
      languagePreference: 'Telugu',
      audience: 'local food lovers',
    },
  },
  contextAssembly: {
    stepId: 'step_5',
    name: 'Context assembly',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      selectedContext: {
        businessIdentity: true,
        productInformation: true,
        currentOffer: true,
        location: true,
        language: true,
        tone: true,
        relevantPreviousCampaignPreferences: true,
        brandRules: true,
      },
      contextSummary: 'Context selected',
    },
  },
  promptBuilder: {
    stepId: 'step_6',
    name: 'Prompt / instruction builder',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      systemInstruction: 'You are Mitra...',
      businessContext: 'BUSINESS: ABC Biryani',
      userRequest: 'Create a funny Telugu ad for Chicken Biryani',
      task: 'Create campaign strategy and copy pack',
      outputSchema: 'CopyPackSchema',
    },
  },
  geminiResponse: {
    stepId: 'step_7',
    name: 'GEMINI / Gemini response',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      headline: 'సన్ డే ఫ్రైడే బిర్యానీ!',
      caption: 'Delicious Chicken Biryani',
      language: 'te',
      tone: 'funny',
      cta: 'order_whatsapp',
    },
  },
  validationTruthCheck: {
    stepId: 'step_8',
    name: 'Validation / Truth Check',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      passed: true,
      checks: [
        { name: 'Correct business', status: 'PASS' },
        { name: 'Correct product', status: 'PASS' },
        { name: 'Correct price', status: 'PASS' },
        { name: 'Telugu requested', status: 'PASS' },
        { name: 'Funny requested', status: 'PASS' },
        { name: 'No invented offer', status: 'PASS' },
        { name: 'CTA present', status: 'PASS' },
        { name: 'Brand rules respected', status: 'PASS' },
      ],
      summary: 'All checks passed',
    },
  },
  mitraTransformations: {
    stepId: 'step_9',
    name: 'Mitra transformations',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      appliedTransformations: [{ name: 'SVG Overlay', description: 'Composited poster' }],
    },
  },
  creativeGeneration: {
    stepId: 'step_10',
    name: 'Creative generation',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      generatedPostersCount: 1,
      storyFramesCount: 3,
      reelStoryboardCount: 4,
      assetsMetadata: [],
    },
  },
  finalCampaign: {
    stepId: 'step_11',
    name: 'Final campaign',
    status: 'passed',
    timestamp: new Date().toISOString(),
    data: {
      campaignId: 'camp_123',
      status: 'verified',
      deliveredAssetsCount: 5,
      customerSummary: 'Delivered to user',
    },
  },
};

describe('PipelineTraceInspector Component', () => {
  it('renders the pipeline trace inspector title and AI TRACE card', () => {
    render(<PipelineTraceInspector trace={mockTrace} />);

    expect(screen.getByText('Internal AI Execution Trace')).toBeInTheDocument();
    expect(screen.getByText('AI TRACE')).toBeInTheDocument();
    expect(screen.getByText('Complete Request Pipeline')).toBeInTheDocument();
  });

  it('allows clicking between stages and inspecting prompt/context details', () => {
    render(<PipelineTraceInspector trace={mockTrace} />);

    // Click on Prompt / instruction builder stage
    const promptStageBtn = screen.getByRole('button', { name: /Prompt \/ instruction builder/i });
    fireEvent.click(promptStageBtn);

    expect(screen.getByText('Actual Gemini Request')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM INSTRUCTION:')).toBeInTheDocument();
    expect(screen.getByText('BUSINESS CONTEXT:')).toBeInTheDocument();
  });

  it('allows inspecting Validation / Truth Check checklist items', () => {
    render(<PipelineTraceInspector trace={mockTrace} />);

    // Click on Validation / Truth Check stage
    const validationBtn = screen.getByRole('button', { name: /Validation \/ Truth Check/i });
    fireEvent.click(validationBtn);

    expect(screen.getAllByText('Validation Checklist').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Correct business').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Correct product').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Correct price').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Telugu requested').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Funny requested').length).toBeGreaterThan(0);
  });
});
