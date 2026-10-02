import { CONFIG } from "./config.js";
import { yearDate } from "./utils.js";

export function getSceneConfigs() {
  return [
    {
      id: "scene1",
      stepLabel: "",
      stepTitle: "Tenure lengths have varied widely, with half of all past justices serving on the Court for more than 16.5 years",
      stepBody: `
        <p>Since 1789, 116 justices have served on the Supreme Court. Their tenures have varied, with some serving multiple decades (the longest being 36.6 years) and others for just over a year.</p><br>
        <p>Overall, the median tenure for past Supreme Court justices is 16.5 years. If the current justices are included, the number is 16.3 years.</p>

        <div class="legend">
          <div class="legend-item"><span class="legend-swatch"></span><span>Past justices</span></div>
          <div class="legend-item"><span class="legend-swatch current"></span><span>Current justices</span></div>
        </div>
      `,
      threshold: CONFIG.sceneThresholds.scene1
    },
    {
      id: "scene2",
      stepLabel: "",
      stepTitle: "68% of past Supreme Court justices served at least 10 years on the Court.",
      stepBody: `
        <p>Looking at the justices’ durability rate is another helpful data point: How many justices remain after, say, 10 years on the bench?</p><br>
        <p>The horizontal line at the 10-year mark divides the justices into two groups: Above the line are the justices who remained on the bench for more than a decade, and below the line reflects those that did not.</p>
      `,
      threshold: CONFIG.sceneThresholds.scene2
    },
    {
      id: "scene4",
      stepLabel: "",
      stepTitle: "At 20 years, the durability rate falls to 40%.",
      stepBody: `
        <p>If the threshold is adjusted to 20 years on the bench, the durability rate falls to 40% — in other words, 40% of past Supreme Court justices served for at least 20 years.</p>
        <br><p><strong>Adjust the threshold by moving the orange line up or down to see durability rate for various tenures.</strong></p>
      `,
      threshold: CONFIG.sceneThresholds.scene4
    },
    {
      id: "scene5",
      stepLabel: "",
      stepTitle: "",
      stepBody: `
        <p>It’s also helpful to look at how the durability rate changes over time. This chart adds that dimension by splitting the Court’s history into two time periods: pre-1966 and post-1966.</p><br>
        <p>Before 1966, about half the justices remained on the bench for 15 years, and half did not. But after 1966, every past justice served for at least 15 years.</p>
      `,
      threshold: CONFIG.sceneThresholds.scene5,
      splitYear: CONFIG.sceneSplitYears.scene5,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene5)
    },
    {
      id: "scene6",
      stepLabel: "",
      stepTitle: "",
      stepBody: `
  
  <p>This graph allows you to adjust both the length of tenure and year in the Court’s history, showing how tenure durability changes across different time splits and tenure thresholds.</p>
`,
      threshold: CONFIG.sceneThresholds.scene6,
      splitYear: CONFIG.sceneSplitYears.scene6,
      splitDate: yearDate(CONFIG.sceneSplitYears.scene6)
    },{
  id: "sceneMedianSplitDraggable",
  stepLabel: "",
  stepTitle: "Median tenure after 1966 is more than 10 years longer than before 1966.",
  stepBody: `
 <p>Supreme Court justices who served on the Court prior to 1966 stayed for a median of 15.3 years. But for the justices that served on the Court after 1966, that number jumps dramatically to a median of 25.7 years (not including the current justices).</p>
 <br><p>Move the purple line to explore how median tenure compares across two time periods.</p>
    `,
  medianOnly: true,
  medianSplitDraggable: true,
  splitYear: CONFIG.sceneSplitYears.sceneMedianSplitDraggable,
  splitDate: yearDate(CONFIG.sceneSplitYears.sceneMedianSplitDraggable)
}
  ];
}