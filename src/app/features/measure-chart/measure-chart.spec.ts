import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeasureChart } from './measure-chart';

describe('MeasureChart', () => {
  let component: MeasureChart;
  let fixture: ComponentFixture<MeasureChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeasureChart],
    }).compileComponents();

    fixture = TestBed.createComponent(MeasureChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
