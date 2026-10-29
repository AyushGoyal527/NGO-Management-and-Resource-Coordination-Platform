================================================================================
        REGRESSION CODING PROBLEMS - COMPREHENSIVE TOPIC GUIDE
        Definitions, Explanations & Examples
================================================================================

TABLE OF CONTENTS
================================================================================
1. Simple Linear Regression
2. Multiple Linear Regression
3. Ridge Regression (L2 Regularization)
4. Lasso Regression (L1 Regularization)
5. Elastic Net Regression
6. Model Evaluation Metrics
7. Feature Engineering & Selection
8. Multicollinearity & VIF
9. Regularization Concepts
10. Learning Curves & Validation

================================================================================
1. SIMPLE LINEAR REGRESSION
================================================================================

DEFINITION
----------
Simple Linear Regression is a statistical method that models the relationship 
between a single independent variable (X) and a dependent variable (Y) using 
a straight line. The model assumes a linear relationship:

    Y = β₀ + β₁X + ε

Where:
  • β₀ = intercept (value of Y when X = 0)
  • β₁ = slope (change in Y for each unit change in X)
  • ε = error term (residuals)


KEY CONCEPTS
------------
1. SLOPE (β₁)
   - Indicates the change in Y for each unit change in X
   - Positive slope: Y increases as X increases
   - Negative slope: Y decreases as X increases

2. INTERCEPT (β₀)
   - The value of Y when X = 0
   - Represents the baseline of the model

3. RESIDUALS
   - Differences between actual values (y) and predicted values (ŷ)
   - Formula: residual = y - ŷ
   - Used to assess model fit

4. ORDINARY LEAST SQUARES (OLS)
   - Method that minimizes the sum of squared residuals
   - Finds the best-fitting line through the data


MATHEMATICAL FORMULAS
---------------------
Slope:     β₁ = Σ[(Xᵢ - X̄)(Yᵢ - Ȳ)] / Σ[(Xᵢ - X̄)²]
Intercept: β₀ = Ȳ - β₁X̄

Where:
  • X̄ = mean of X values
  • Ȳ = mean of Y values
  • Σ = summation


PYTHON EXAMPLE
--------------
from sklearn.linear_model import LinearRegression
import numpy as np
import matplotlib.pyplot as plt

# Sample data
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 5, 4, 6])

# Fit the model
model = LinearRegression()
model.fit(X, y)

# Print results
print(f"Slope: {model.coef_[0]:.2f}")
print(f"Intercept: {model.intercept_:.2f}")

# Make predictions
y_pred = model.predict(X)
print(f"Predictions: {y_pred}")

# Plot
plt.scatter(X, y, label='Actual')
plt.plot(X, y_pred, color='red', label='Fitted Line')
plt.legend()
plt.show()


LINE ASSUMPTIONS
----------------
To ensure the validity of simple linear regression, the following assumptions 
should be checked:

1. LINEARITY
   - The relationship between X and Y is linear
   - Check: Scatter plot of X vs Y should show linear pattern

2. INDEPENDENCE
   - Observations are independent of each other
   - Check: Data should be collected independently

3. NORMALITY
   - Residuals are normally distributed
   - Check: Histogram of residuals should be bell-shaped
   - Check: Q-Q plot of residuals should be roughly straight

4. EQUAL VARIANCE (HOMOSCEDASTICITY)
   - Residuals have constant variance across all X values
   - Check: Residual plot should show random scatter with no pattern


INTERPRETATION EXAMPLE
----------------------
If β₁ = 2.5, it means:
  "For every 1 unit increase in X, Y increases by 2.5 units on average"

If β₀ = 10, it means:
  "When X = 0, the predicted Y value is 10"


================================================================================
2. MULTIPLE LINEAR REGRESSION
================================================================================

DEFINITION
----------
Multiple Linear Regression extends simple linear regression to multiple 
independent variables. The model is:

    Y = β₀ + β₁X₁ + β₂X₂ + ... + βₚXₚ + ε

Where:
  • Y = dependent variable (response)
  • X₁, X₂, ..., Xₚ = independent variables (predictors)
  • β₀, β₁, ..., βₚ = regression coefficients
  • ε = error term

Each β coefficient represents the change in Y when the corresponding X 
variable increases by 1 unit, HOLDING OTHER VARIABLES CONSTANT (partial effect).


MATRIX NOTATION
---------------
The elegant matrix form of multiple linear regression is:

    β̂ = (XᵀX)⁻¹XᵀY

Where:
  • X = design matrix (n × p+1), where n is samples, p is features
       First column is all 1s (for intercept)
  • Y = response vector (n × 1)
  • β̂ = estimated coefficient vector (p+1 × 1)
  • Xᵀ = transpose of X
  • (XᵀX)⁻¹ = inverse of XᵀX

This closed-form solution gives the OLS estimates directly without iteration.


PYTHON EXAMPLE - Using Sklearn
-------------------------------
from sklearn.linear_model import LinearRegression
from sklearn.datasets import load_diabetes
from sklearn.model_selection import train_test_split

# Load diabetes dataset (10 numeric features)
X, y = load_diabetes(return_X_y=True)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Fit model
model = LinearRegression()
model.fit(X_train, y_train)

# Evaluate
train_r2 = model.score(X_train, y_train)
test_r2 = model.score(X_test, y_test)

print(f"Training R²: {train_r2:.4f}")
print(f"Testing R²: {test_r2:.4f}")
print(f"\nCoefficients:")
for i, coef in enumerate(model.coef_):
    print(f"  Feature {i}: {coef:.4f}")
print(f"Intercept: {model.intercept_:.4f}")


PYTHON EXAMPLE - Manual Implementation with NumPy
--------------------------------------------------
import numpy as np

# Add intercept column (column of 1s)
X_with_intercept = np.column_stack([np.ones(len(X)), X])

# Calculate β̂ = (XᵀX)⁻¹XᵀY
X_transpose = X_with_intercept.T
beta_hat = np.linalg.inv(X_transpose @ X_with_intercept) @ X_transpose @ y

print(f"Intercept: {beta_hat[0]:.4f}")
print(f"Coefficients: {beta_hat[1:]}")


FEATURE INTERPRETATION
----------------------
Coefficient = 0.5 means:
  "For each unit increase in this feature, Y increases by 0.5 units 
   (holding all other features constant)"

Coefficient = -2.3 means:
  "For each unit increase in this feature, Y decreases by 2.3 units 
   (holding all other features constant)"

Larger absolute coefficients indicate stronger effects (more important features).


================================================================================
3. RIDGE REGRESSION (L2 REGULARIZATION)
================================================================================

DEFINITION
----------
Ridge Regression adds an L2 penalty term (sum of squared coefficients) to the 
loss function. This shrinks coefficients toward zero to reduce model complexity 
and prevent overfitting.

The objective is to minimize:

    Loss = ||Y - Xβ||² + α||β||²
    
Or written as:
    
    Loss = Σ(yᵢ - ŷᵢ)² + α∑β²ⱼ

Where:
  • First term = mean squared error (prediction error)
  • Second term = L2 penalty (sum of squared coefficients)
  • α (alpha) = regularization strength (hyperparameter)
    - α = 0: No regularization (becomes OLS)
    - α small: Weak penalty
    - α large: Strong penalty, more shrinkage


KEY CHARACTERISTICS
-------------------
1. SHRINKAGE METHOD
   - Coefficients are shrunk toward zero but never exactly zero
   - Unlike Lasso, Ridge doesn't eliminate features

2. MULTICOLLINEARITY SOLUTION
   - Handles correlated features much better than OLS
   - Distributes effect among correlated features

3. ALPHA PARAMETER
   - Controls regularization strength
   - Must be tuned using cross-validation
   - Best α found via GridSearchCV or RidgeCV

4. BIAS-VARIANCE TRADEOFF
   - Increases bias slightly
   - Significantly reduces variance
   - Improves generalization to test data


WHEN TO USE RIDGE
-----------------
✓ When features are correlated (multicollinearity)
✓ When you have more features than samples (p > n)
✓ When preventing overfitting is important
✓ When you want to keep all features


PYTHON EXAMPLE - Basic Ridge
-----------------------------
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# Prepare data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Scale features (important for Ridge!)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Fit Ridge with alpha=1.0
ridge = Ridge(alpha=1.0)
ridge.fit(X_train_scaled, y_train)

# Evaluate
train_r2 = ridge.score(X_train_scaled, y_train)
test_r2 = ridge.score(X_test_scaled, y_test)

print(f"Training R²: {train_r2:.4f}")
print(f"Testing R²: {test_r2:.4f}")
print(f"Coefficient magnitudes: {np.abs(ridge.coef_)}")


PYTHON EXAMPLE - Ridge with Pipeline
-------------------------------------
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge

# Create pipeline: scale + ridge
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('ridge', Ridge(alpha=1.0))
])

# Fit and evaluate
pipe.fit(X_train, y_train)
test_r2 = pipe.score(X_test, y_test)
print(f"Test R²: {test_r2:.4f}")


PYTHON EXAMPLE - Ridge with Cross-Validation
---------------------------------------------
from sklearn.linear_model import RidgeCV
import numpy as np

# Alphas to test
alphas = np.logspace(-2, 4, 50)  # 0.01 to 10000

# Fit with 5-fold cross-validation
ridge_cv = RidgeCV(alphas=alphas, cv=5)
ridge_cv.fit(X_train_scaled, y_train)

print(f"Best alpha: {ridge_cv.alpha_:.4f}")
print(f"Test R²: {ridge_cv.score(X_test_scaled, y_test):.4f}")


RIDGE TRACE PLOT
----------------
A Ridge Trace shows how each coefficient changes as alpha increases:

  • X-axis: log(alpha) - regularization strength (log scale)
  • Y-axis: coefficient values
  • Each line: one feature's coefficient
  
As alpha increases, all coefficients shrink toward zero.

Python code:
from sklearn.linear_model import Ridge
import numpy as np
import matplotlib.pyplot as plt

alphas = np.logspace(-2, 4, 50)
coefficients = []

for alpha in alphas:
    ridge = Ridge(alpha=alpha)
    ridge.fit(X_train_scaled, y_train)
    coefficients.append(ridge.coef_)

coefficients = np.array(coefficients)

plt.figure(figsize=(10, 6))
for i in range(coefficients.shape[1]):
    plt.plot(np.log10(alphas), coefficients[:, i], label=f'Feature {i}')

plt.xlabel('log10(alpha)')
plt.ylabel('Coefficient Value')
plt.title('Ridge Trace Plot')
plt.legend()
plt.grid(True)
plt.show()


KEY INSIGHT
-----------
The sum of absolute coefficients decreases as alpha increases.
This shows the regularization effect: larger α leads to smaller coefficients.


================================================================================
4. LASSO REGRESSION (L1 REGULARIZATION)
================================================================================

DEFINITION
----------
Lasso (Least Absolute Shrinkage and Selection Operator) adds an L1 penalty 
(sum of absolute values of coefficients) to the loss function. It performs 
automatic feature selection by shrinking less important coefficients to 
EXACTLY ZERO.

The objective is to minimize:

    Loss = ||Y - Xβ||² + α||β||₁
    
Or written as:
    
    Loss = Σ(yᵢ - ŷᵢ)² + α∑|βⱼ|

Where:
  • First term = mean squared error
  • Second term = L1 penalty (sum of absolute values)
  • α (alpha) = regularization strength


KEY DIFFERENCES FROM RIDGE
---------------------------
                    LASSO              RIDGE
Feature Selection   YES (zeros out)    NO (shrinks)
Sparsity           High (sparse)       Low (dense)
Penalty Form       α∑|β|              α∑β²
Use Case           Feature selection   Multicollinearity
Interpretability   Easy (fewer vars)   Hard (all vars)


WHEN TO USE LASSO
-----------------
✓ When you need feature selection (reduce feature count)
✓ When model interpretability is important
✓ When many features are irrelevant
✓ When you want a sparse model


PYTHON EXAMPLE - Basic Lasso
-----------------------------
from sklearn.linear_model import Lasso
from sklearn.preprocessing import StandardScaler

# Scale features (crucial for Lasso!)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Fit Lasso with alpha=0.1
lasso = Lasso(alpha=0.1)
lasso.fit(X_train_scaled, y_train)

# Count zero coefficients
non_zero = (lasso.coef_ != 0).sum()
zero = (lasso.coef_ == 0).sum()

print(f"Non-zero coefficients: {non_zero}")
print(f"Zero coefficients: {zero}")
print(f"Non-zero features: {np.where(lasso.coef_ != 0)[0]}")


PYTHON EXAMPLE - Lasso with Cross-Validation
---------------------------------------------
from sklearn.linear_model import LassoCV
import numpy as np

# LassoCV automatically selects best alpha
lasso_cv = LassoCV(cv=5)
lasso_cv.fit(X_train_scaled, y_train)

print(f"Best alpha: {lasso_cv.alpha_:.6f}")
print(f"Non-zero coefficients: {(lasso_cv.coef_ != 0).sum()}")
print(f"Training R²: {lasso_cv.score(X_train_scaled, y_train):.4f}")
print(f"Testing R²: {lasso_cv.score(X_test_scaled, y_test):.4f}")

# Which features survived?
surviving_features = np.where(lasso_cv.coef_ != 0)[0]
print(f"Surviving features: {surviving_features}")


LASSO COEFFICIENT PATH
----------------------
Shows how coefficients change as alpha increases:

  • X-axis: log(alpha) - regularization strength
  • Y-axis: coefficient values
  • Features drop to zero in sequence as α increases

The order features are eliminated indicates their importance:
Features with weak signal are eliminated first.

Python code:
from sklearn.linear_model import Lasso
import numpy as np
import matplotlib.pyplot as plt

alphas = np.logspace(-3, 1, 50)
coefficients = []

for alpha in alphas:
    lasso = Lasso(alpha=alpha, max_iter=10000)
    lasso.fit(X_train_scaled, y_train)
    coefficients.append(lasso.coef_)

coefficients = np.array(coefficients)

plt.figure(figsize=(10, 6))
for i in range(coefficients.shape[1]):
    plt.plot(np.log10(alphas), coefficients[:, i], label=f'Feature {i}')

plt.xlabel('log10(alpha)')
plt.ylabel('Coefficient Value')
plt.title('Lasso Coefficient Paths')
plt.legend()
plt.grid(True)
plt.show()


FEATURE ELIMINATION ORDER
------------------------
As alpha increases, features are eliminated in order:

Example output:
log(α) = -2.0: Features [0,1,2,3,4,5,6,7,8,9] are non-zero (all kept)
log(α) = -1.0: Features [0,2,3,5,7,8,9] are non-zero (1,4,6 eliminated)
log(α) =  0.0: Features [3,5,8] are non-zero (others eliminated)
log(α) =  1.0: Feature [5] is non-zero (others eliminated)

Feature [5] is the "last standing" - most important feature.


KEY INSIGHT
-----------
Lasso provides automatic feature selection.
As α increases, weak features are eliminated first.
Useful for high-dimensional data with many irrelevant features.


================================================================================
5. ELASTIC NET REGRESSION
================================================================================

DEFINITION
----------
Elastic Net combines L1 and L2 penalties for a balanced regularization approach.
It's particularly useful when you have many correlated features and want both 
feature selection and coefficient shrinkage.

The objective is to minimize:

    Loss = ||Y - Xβ||² + α(ρ||β||₁ + (1-ρ)||β||²)

Where:
  • α = regularization strength
  • ρ (rho) = L1 ratio (0 to 1)
    - ρ = 0: Pure Ridge (L2 only)
    - ρ = 0.5: Equal L1 and L2
    - ρ = 1: Pure Lasso (L1 only)


WHY ELASTIC NET?
----------------
Problem: Lasso sometimes unstable with highly correlated features.
         Ridge doesn't select features.

Solution: Elastic Net combines both benefits
✓ L1 component: Feature selection
✓ L2 component: Handles correlations and stability


WHEN TO USE ELASTIC NET
-----------------------
✓ Many correlated features (better than pure Lasso)
✓ Need both feature selection and prediction accuracy
✓ Large number of features (p >> n)
✓ Want robustness against feature correlations


PYTHON EXAMPLE - Basic Elastic Net
-----------------------------------
from sklearn.linear_model import ElasticNet
from sklearn.preprocessing import StandardScaler

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Fit Elastic Net (50% L1, 50% L2)
en = ElasticNet(alpha=0.1, l1_ratio=0.5)
en.fit(X_train_scaled, y_train)

# Evaluate
train_r2 = en.score(X_train_scaled, y_train)
test_r2 = en.score(X_test_scaled, y_test)
non_zero = (en.coef_ != 0).sum()

print(f"Training R²: {train_r2:.4f}")
print(f"Testing R²: {test_r2:.4f}")
print(f"Non-zero coefficients: {non_zero}")


PYTHON EXAMPLE - Elastic Net with Cross-Validation
---------------------------------------------------
from sklearn.linear_model import ElasticNetCV
import numpy as np

# Test multiple l1_ratio values
l1_ratios = [0.2, 0.5, 0.8]

en_cv = ElasticNetCV(
    l1_ratio=l1_ratios,
    cv=5,
    alphas=np.logspace(-2, 4, 50)
)
en_cv.fit(X_train_scaled, y_train)

print(f"Best l1_ratio: {en_cv.l1_ratio_:.2f}")
print(f"Best alpha: {en_cv.alpha_:.6f}")
print(f"Test R²: {en_cv.score(X_test_scaled, y_test):.4f}")


COMPARISON: Lasso vs Ridge vs Elastic Net
------------------------------------------
Scenario 1: Few relevant features, many noise features
  Best: Lasso (strong feature selection)

Scenario 2: All features relevant, some correlated
  Best: Ridge (keeps all, handles correlation)

Scenario 3: Many features, strong correlations among them
  Best: Elastic Net (feature selection + correlation handling)

Example code - Compare all three:
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.metrics import mean_squared_error
import numpy as np

models = {
    'Ridge': Ridge(alpha=1.0),
    'Lasso': Lasso(alpha=0.1),
    'ElasticNet': ElasticNet(alpha=0.1, l1_ratio=0.5)
}

for name, model in models.items():
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    non_zero = (model.coef_ != 0).sum()
    print(f"{name}: RMSE={rmse:.2f}, Non-zero coefs={non_zero}")


================================================================================
6. MODEL EVALUATION METRICS
================================================================================

OVERALL CONCEPT
---------------
Model evaluation metrics measure how well a regression model fits the data
and predicts on new data. Different metrics capture different aspects of
model performance.


R² SCORE (COEFFICIENT OF DETERMINATION)
----------------------------------------
DEFINITION:
R² measures the proportion of variance in Y explained by the model.
Range: 0 to 1 (higher is better)

FORMULA:
R² = 1 - (SS_res / SS_tot)
   = 1 - (Σ(yᵢ - ŷᵢ)² / Σ(yᵢ - ȳ)²)

Where:
  • SS_res = residual sum of squares (prediction errors)
  • SS_tot = total sum of squares (variance in data)

INTERPRETATION:
  R² = 0.9   → 90% of variance explained (Excellent!)
  R² = 0.7   → 70% of variance explained (Good)
  R² = 0.5   → 50% of variance explained (Fair)
  R² = 0.3   → 30% of variance explained (Poor)
  R² = 0.0   → No variance explained (Very poor)

EXAMPLE:
from sklearn.metrics import r2_score
y_actual = [3, -0.5, 2, 7]
y_pred = [2.5, 0.0, 2, 8]
r2 = r2_score(y_actual, y_pred)
print(f"R²: {r2:.4f}")  # Output: R²: 0.9486


ADJUSTED R²
-----------
DEFINITION:
Adjusted R² penalizes R² for adding more features. Prevents overfitting 
by rewarding simpler models with fewer features.

FORMULA:
Adj-R² = 1 - [(1 - R²) × (n - 1) / (n - p - 1)]

Where:
  • n = number of observations
  • p = number of features
  • R² = coefficient of determination

KEY POINT:
If adding a feature decreases Adjusted R², that feature isn't worth including.

INTERPRETATION:
Always use Adjusted R² when comparing models with different numbers of features.

EXAMPLE:
from sklearn.metrics import r2_score

def adjusted_r2(y_actual, y_pred, n_features):
    r2 = r2_score(y_actual, y_pred)
    n = len(y_actual)
    adj_r2 = 1 - ((1 - r2) * (n - 1) / (n - n_features - 1))
    return adj_r2

y_actual = [3, -0.5, 2, 7, 5, 4, 6]
y_pred = [2.5, 0.0, 2, 8, 4.8, 4.2, 5.9]
adj_r2_2features = adjusted_r2(y_actual, y_pred, 2)
adj_r2_5features = adjusted_r2(y_actual, y_pred, 5)

print(f"Adj-R² (2 features): {adj_r2_2features:.4f}")
print(f"Adj-R² (5 features): {adj_r2_5features:.4f}")


RMSE (ROOT MEAN SQUARED ERROR)
-------------------------------
DEFINITION:
Square root of average squared prediction errors.
Same units as Y; lower is better.

FORMULA:
RMSE = √(Σ(yᵢ - ŷᵢ)² / n)
     = √(MSE)

Where:
  • MSE = mean squared error
  • n = number of observations

INTERPRETATION:
RMSE = 2.5  → Predictions are off by ~2.5 units on average
RMSE = 0.1  → Very accurate predictions
RMSE = 10   → Large errors in predictions

ADVANTAGES:
✓ Same units as target variable (interpretable)
✓ Penalizes large errors more (squared term)
✓ Widely used and understood

DISADVANTAGES:
✗ Sensitive to outliers (squared errors)

EXAMPLE:
from sklearn.metrics import mean_squared_error
import numpy as np

y_actual = [3, -0.5, 2, 7]
y_pred = [2.5, 0.0, 2, 8]

mse = mean_squared_error(y_actual, y_pred)
rmse = np.sqrt(mse)

print(f"MSE: {mse:.4f}")
print(f"RMSE: {rmse:.4f}")


MAE (MEAN ABSOLUTE ERROR)
--------------------------
DEFINITION:
Average of absolute prediction errors.
Same units as Y; lower is better.

FORMULA:
MAE = (Σ|yᵢ - ŷᵢ|) / n

INTERPRETATION:
MAE = 2.0  → Predictions are off by 2 units on average
MAE = 0.5  → Very accurate predictions

ADVANTAGES:
✓ Same units as target variable
✓ Less sensitive to outliers (absolute value, not squared)
✓ Interpretable and intuitive

DISADVANTAGES:
✗ Doesn't penalize large errors more

EXAMPLE:
from sklearn.metrics import mean_absolute_error

y_actual = [3, -0.5, 2, 7]
y_pred = [2.5, 0.0, 2, 8]

mae = mean_absolute_error(y_actual, y_pred)
print(f"MAE: {mae:.4f}")


COMPARISON: RMSE vs MAE
-----------------------
        RMSE           MAE
Data with outliers:  Inflated     More robust
Penalizes errors:    Large errors Small errors
Units:               Same as Y    Same as Y
Interpretability:    Moderate     High
Mathematical:        Differentiable Non-smooth


COMPLETE EVALUATION EXAMPLE
---------------------------
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
import numpy as np

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Fit model
model = LinearRegression()
model.fit(X_train, y_train)

# Predict
y_pred_train = model.predict(X_train)
y_pred_test = model.predict(X_test)

# Evaluate
print("=" * 50)
print("TRAINING SET")
print("=" * 50)
print(f"R²:   {r2_score(y_train, y_pred_train):.4f}")
print(f"RMSE: {np.sqrt(mean_squared_error(y_train, y_pred_train)):.4f}")
print(f"MAE:  {mean_absolute_error(y_train, y_pred_train):.4f}")

print("\n" + "=" * 50)
print("TEST SET")
print("=" * 50)
print(f"R²:   {r2_score(y_test, y_pred_test):.4f}")
print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred_test)):.4f}")
print(f"MAE:  {mean_absolute_error(y_test, y_pred_test):.4f}")


================================================================================
7. FEATURE ENGINEERING & SELECTION
================================================================================

FEATURE ENGINEERING
-------------------
DEFINITION:
Creating new features or transforming existing ones to improve model 
performance and interpretability.

WHY FEATURE ENGINEERING?
✓ Improves model performance
✓ Reduces training time
✓ Makes models more interpretable
✓ Handles missing data
✓ Reduces effect of outliers
✓ Prevents overfitting


COMMON FEATURE ENGINEERING TECHNIQUES
--------------------------------------

1. STANDARDIZATION / NORMALIZATION
   Purpose: Scale features to similar ranges
   
   Standardization (Z-score):
   X_scaled = (X - X_mean) / X_std
   → Mean = 0, Standard deviation = 1
   
   Min-Max Normalization:
   X_scaled = (X - X_min) / (X_max - X_min)
   → Range: [0, 1]
   
   Example:
   from sklearn.preprocessing import StandardScaler
   scaler = StandardScaler()
   X_scaled = scaler.fit_transform(X_train)


2. CATEGORICAL ENCODING
   Purpose: Convert categorical variables to numeric
   
   Example: Color = ['red', 'blue', 'green']
   
   A) Label Encoding (0, 1, 2):
      from sklearn.preprocessing import LabelEncoder
      encoder = LabelEncoder()
      encoded = encoder.fit_transform(['red', 'blue', 'green'])
      # Output: [2 0 1]
   
   B) One-Hot Encoding (separate binary columns):
      from sklearn.preprocessing import OneHotEncoder
      encoder = OneHotEncoder(drop='first')
      
      Original:  color
                 'red'
                 'blue'
                 'green'
      
      Encoded:   color_blue  color_green
                 0           0      (red - baseline)
                 1           0      (blue)
                 0           1      (green)


3. BINNING / DISCRETIZATION
   Purpose: Convert continuous to categorical
   
   Example: Age = [5, 15, 25, 35, 45, 55, 65]
   
   Binning into categories:
   'child' (0-18), 'adult' (18-60), 'senior' (60+)
   
   Code:
   import pandas as pd
   age_binned = pd.cut(df['age'], 
                       bins=[0, 18, 60, 100],
                       labels=['child', 'adult', 'senior'])


4. POLYNOMIAL FEATURES
   Purpose: Capture non-linear relationships
   
   Example: X = [1, 2, 3]
   
   Linear features: X
   Polynomial (degree=2): X, X², X₁·X₂
   
   Code:
   from sklearn.preprocessing import PolynomialFeatures
   poly = PolynomialFeatures(degree=2)
   X_poly = poly.fit_transform(X)


5. INTERACTION TERMS
   Purpose: Capture combined effects of features
   
   Example: If age affects income differently for men vs women
   Interaction term: age × gender
   
   Code:
   X['age_gender'] = X['age'] * X['gender']


FEATURE SELECTION
-----------------
DEFINITION:
Choosing the most relevant subset of features for the model.
Reduces dimensionality, improves interpretability, prevents overfitting.


FEATURE SELECTION METHODS
--------------------------

1. FORWARD SELECTION
   Start with no features, add one feature at a time
   
   Process:
   Step 1: Fit model with feature 1 → R² = 0.45
           Fit model with feature 2 → R² = 0.50 (best)
           Keep feature 2
   
   Step 2: Fit model with features 2+1 → R² = 0.68
           Fit model with features 2+3 → R² = 0.65
           Keep features 2+1
   
   Step 3: Continue until adding features decreases R²

2. BACKWARD SELECTION
   Start with all features, remove one at a time
   
   Process:
   Start with all features → R² = 0.75
   Remove feature 1 → R² = 0.76 (improve! keep removing)
   Remove feature 2 → R² = 0.70 (worse, put back)
   Continue...

3. LASSO / ELASTIC NET
   Automatic feature selection via L1 penalty
   (Covered in section 4)


ONE-HOT ENCODING & DUMMY TRAP
------------------------------
DEFINITION OF DUMMY TRAP:
Creating perfectly collinear features by including all categorical levels.

EXAMPLE:
Color: ['red', 'blue', 'green']

WRONG (Dummy Trap):
    color_red  color_blue  color_green
    1          0           0           (red)
    0          1           0           (blue)
    0          0           1           (green)

PROBLEM: color_red + color_blue + color_green = 1 (always!)
This creates perfect multicollinearity.

RIGHT (Drop First Level):
    color_blue  color_green
    0           0           (red - baseline/reference)
    1           0           (blue)
    0           1           (green)

SOLUTION:
from sklearn.preprocessing import OneHotEncoder
encoder = OneHotEncoder(drop='first')  # Drop first category
encoded = encoder.fit_transform(X)

INTERPRETATION:
The dropped level (baseline) is the reference category.
Other coefficients are interpreted relative to it.

Example: If 'red' is dropped:
  coef_blue = +5 means: blue earns $5 more than red (on average)
  coef_green = -2 means: green earns $2 less than red (on average)


================================================================================
8. MULTICOLLINEARITY & VIF
================================================================================

WHAT IS MULTICOLLINEARITY?
---------------------------
DEFINITION:
High correlation among independent variables. Causes unstable, unreliable 
coefficient estimates.

EXAMPLE:
Suppose we predict house price with:
  • Size (square feet)
  • Rooms (number)
  
These are highly correlated (bigger house = more rooms).
The model can't isolate which one affects price more.


PROBLEMS CAUSED BY MULTICOLLINEARITY
-------------------------------------

1. UNSTABLE COEFFICIENTS
   Small data changes → large coefficient changes
   Example:
   Dataset 1: Size coef = +100
   Dataset 2: Size coef = -50 (changed sign!)

2. WIDE CONFIDENCE INTERVALS
   High standard errors on coefficients
   Reduces statistical significance

3. POOR INTERPRETABILITY
   Can't determine individual feature effects
   "Is it size or rooms that matters?"

4. OVERFITTING
   Model may not generalize to new data

5. INFLATED VIF VALUES
   High variance inflation factors (VIF > 5-10)


VARIANCE INFLATION FACTOR (VIF)
-------------------------------
DEFINITION:
Measures how much a coefficient's variance is inflated due to 
correlation with other features.

FORMULA:
VIF_i = 1 / (1 - R²_i)

Where R²_i is the R² from regressing X_i on all other X variables.

INTERPRETATION:
VIF = 1.0   → No correlation (ideal)
VIF = 1.5   → Modest correlation (okay)
VIF = 3.0   → Moderate correlation (be careful)
VIF = 5.0   → High correlation (problematic)
VIF = 10+   → Severe multicollinearity (fix needed)

RULE OF THUMB:
If VIF > 5-10, consider removing the feature.


PYTHON EXAMPLE - Calculate VIF
-------------------------------
from statsmodels.stats.outliers_influence import variance_inflation_factor
import pandas as pd
import numpy as np

# Example data
X = np.array([
    [1, 2, 3],
    [2, 4, 6],
    [3, 6, 9],
    [4, 8, 12]
])

# Create DataFrame
X_df = pd.DataFrame(X, columns=['Feature1', 'Feature2', 'Feature3'])

# Calculate VIF for each feature
vif_data = pd.DataFrame()
vif_data['Feature'] = X_df.columns
vif_data['VIF'] = [variance_inflation_factor(X, i) for i in range(X.shape[1])]

print(vif_data)

Output:
       Feature      VIF
0    Feature1       inf   ← Feature1 = 2×Feature2 (perfect correlation)
1    Feature2       inf   ← Feature2 = 0.5×Feature1 (perfect correlation)
2    Feature3       inf   ← Feature3 = Feature1 + Feature2 (perfect multicollinearity)


EXAMPLE: MULTICOLLINEARITY IN ACTION
------------------------------------
from sklearn.linear_model import LinearRegression
import numpy as np

# Create highly correlated features
X = np.array([
    [10, 10.1],
    [20, 20.2],
    [30, 30.1],
    [40, 40.0],
    [50, 49.9]
])
y = np.array([25, 50, 75, 100, 125])

# Fit model
model = LinearRegression()
model.fit(X, y)

print(f"Coefficients: {model.coef_}")
# Output: [2.63 -1.63] (very different, unstable!)
#
# Expected: Both should be around 2.5 (since X1 ≈ X2)
# Actual: Opposite signs! High coefficients trying to offset each other


SOLUTIONS TO MULTICOLLINEARITY
--------------------------------

1. REMOVE FEATURES
   Drop highly correlated features
   
   Code:
   # Remove Feature 2 if correlated with Feature 1
   X = X.drop(columns=['Feature2'])

2. USE RIDGE REGRESSION
   L2 penalty stabilizes correlated coefficients
   
   Code:
   from sklearn.linear_model import Ridge
   model = Ridge(alpha=1.0)
   model.fit(X_scaled, y)
   
   Ridge shrinks coefficients but keeps both features

3. USE LASSO
   L1 penalty selects one feature from correlated pair
   
   Code:
   from sklearn.linear_model import Lasso
   model = Lasso(alpha=0.1)
   model.fit(X_scaled, y)
   
   Lasso eliminates one of two correlated features

4. USE PCA (PRINCIPAL COMPONENT ANALYSIS)
   Transform correlated features into uncorrelated components
   
   Code:
   from sklearn.decomposition import PCA
   pca = PCA(n_components=2)
   X_pca = pca.fit_transform(X)

5. DOMAIN KNOWLEDGE
   Combine related features into one meaningful variable
   
   Example:
   Instead of: height, width
   Use: area = height × width


================================================================================
9. REGULARIZATION CONCEPTS
================================================================================

WHY REGULARIZATION?
-------------------
PROBLEM: Complex models overfit - perform well on training data but poorly 
on test data.

SOLUTION: Regularization adds a penalty for model complexity.
Add penalty term to loss function to encourage simpler models.


LOSS FUNCTION WITH REGULARIZATION
----------------------------------
Without regularization (OLS):
    Loss = Σ(yᵢ - ŷᵢ)²

With regularization:
    Loss = Σ(yᵢ - ŷᵢ)² + Penalty Term

The penalty term discourages large coefficients (complex model).


BIAS-VARIANCE TRADEOFF
----------------------
KEY CONCEPT: Every model has two sources of error

1. BIAS
   Error from oversimplified model (underfitting)
   → Model is too simple, misses patterns
   
   Symptoms:
   • High training error
   • High test error
   • Model doesn't capture relationships

2. VARIANCE
   Error from model too sensitive to training data (overfitting)
   → Model memorizes noise
   
   Symptoms:
   • Low training error
   • High test error
   • Large gap between train and test performance

TOTAL ERROR:
    Total Error = Bias² + Variance + Irreducible Error

REGULARIZATION EFFECT:
    ↓ Increases Bias slightly
    ↓ Decreases Variance significantly
    → Overall error decreases

VISUALIZATION:
    Error
    ^
    |     Underfitting          Overfitting
    |     High Bias             High Variance
    |        /\                 /
    |       /  \               /
    |      /    \             /
    |     /      \___________/
    |____________________________→ Model Complexity


COMPARING L1 AND L2 PENALTIES
------------------------------

                L1 (Lasso)         L2 (Ridge)
Penalty:        α∑|β|              α∑β²
Effect:         Shrinks to zero    Shrinks (not zero)
Sparsity:       Yes (sparse)       No (dense)
Geometry:       Diamond shape      Circle shape
Feature Sel:    Yes                No

L1 PENALTY GEOMETRY:
Constraint region is diamond-shaped
Optimum often occurs at corners (coordinates = 0)
Results in exact zeros (sparse solution)

L2 PENALTY GEOMETRY:
Constraint region is circle-shaped
Optimum rarely at corners
Coefficients shrink but not to zero


HYPERPARAMETER ALPHA (α)
------------------------
Alpha controls regularization strength:

α = 0 (No penalty):
  → Model = OLS (ordinary least squares)
  → Can overfit if features are correlated

α = small (e.g., 0.001):
  → Weak regularization
  → Close to OLS
  → Still may overfit

α = medium (e.g., 1.0):
  → Moderate regularization
  → Good balance (typical)

α = large (e.g., 100):
  → Strong regularization
  → Underfits
  → All coefficients close to zero

FINDING BEST ALPHA:
Use cross-validation (GridSearchCV, RidgeCV, LassoCV)

from sklearn.linear_model import RidgeCV
import numpy as np

alphas = np.logspace(-2, 4, 100)
ridge_cv = RidgeCV(alphas=alphas, cv=5)
ridge_cv.fit(X_train_scaled, y_train)

print(f"Best alpha: {ridge_cv.alpha_:.4f}")


EFFECT OF ALPHA ON MODEL
------------------------
Consider a simple Ridge regression:

α = 0.001:    R² = 0.70 (high variance, overfitting)
α = 0.1:      R² = 0.72 (better)
α = 1.0:      R² = 0.75 (best) ← Sweet spot
α = 10:       R² = 0.72 (underfitting)
α = 100:      R² = 0.50 (severe underfitting)

Use CV error to find optimal α (not training error).


================================================================================
10. LEARNING CURVES & VALIDATION
================================================================================

CROSS-VALIDATION
----------------
DEFINITION:
Technique to evaluate model performance using multiple train-test splits.
Uses all data for both training and validation.

WHY CROSS-VALIDATION?
✓ More reliable than single train-test split
✓ Reduces variance in performance estimate
✓ Uses data efficiently
✓ Better for small datasets


K-FOLD CROSS-VALIDATION
-----------------------
PROCESS:
1. Split data into k equal-sized folds
2. For each fold i:
   - Use fold i as test set
   - Use remaining k-1 folds as training set
   - Train model and record error
3. Average errors across all k iterations

EXAMPLE: 5-Fold CV with 100 samples (20 per fold)

Fold 1: Train on samples [21-100], Test on [1-20]
Fold 2: Train on [1-20,41-100], Test on [21-40]
Fold 3: Train on [1-40,61-100], Test on [41-60]
Fold 4: Train on [1-60,81-100], Test on [61-80]
Fold 5: Train on [1-80], Test on [81-100]

Final Score = Average of 5 fold scores


STANDARD VALUES:
5-fold CV: Balanced, widely used
10-fold CV: More folds, more computation, lower variance
LOO-CV (Leave-One-Out): Expensive but unbiased


PYTHON EXAMPLE - K-Fold Cross-Validation
------------------------------------------
from sklearn.model_selection import cross_val_score, cross_validate
from sklearn.linear_model import Ridge
import numpy as np

model = Ridge(alpha=1.0)

# Simple cross-validation
cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
print(f"CV Scores: {cv_scores}")
print(f"Mean CV Score: {cv_scores.mean():.4f}")
print(f"Std Dev: {cv_scores.std():.4f}")

Output:
CV Scores: [0.72 0.68 0.75 0.70 0.74]
Mean CV Score: 0.7180
Std Dev: 0.0243

# Multiple metrics
scores = cross_validate(model, X, y, cv=5,
                        scoring=['r2', 'neg_mean_squared_error'])
print(f"R² scores: {scores['test_r2']}")
print(f"RMSE: {np.sqrt(-scores['test_neg_mean_squared_error'])}")


LEARNING CURVES
---------------
DEFINITION:
Plots showing training and validation error as training set size increases.
Helps diagnose bias and variance problems.

AXES:
X-axis: Training set size (number of samples)
Y-axis: Error (MSE, RMSE, or 1-R²)

Two curves:
• Training error: Error on training set
• Validation error: Error on validation set (CV)


INTERPRETING LEARNING CURVES
-----------------------------

CASE 1: HIGH BIAS (Underfitting)
Symptoms:
  • Both curves high
  • Curves converge (close together)
  • Adding more data doesn't help
  
Graph:
  Error
  ^
  |     /‾‾‾‾‾‾‾‾ ← Training
  |    /‾‾‾‾‾‾‾‾ ← Validation
  |   /
  |__/________________→ Training Size


CASE 2: HIGH VARIANCE (Overfitting)
Symptoms:
  • Large gap between curves
  • Training error low, validation high
  • Adding more data reduces gap
  
Graph:
  Error
  ^
  |                      ← Validation
  |        /‾‾‾‾‾‾‾‾
  |       /
  |      / ← Training
  |     /
  |____/_________________→ Training Size


CASE 3: GOOD MODEL (Balanced)
Symptoms:
  • Both curves low
  • Curves close together
  • Both decrease with more data
  
Graph:
  Error
  ^
  |
  |    \
  |     \_____ ← Validation
  |      \___ ← Training
  |       ‾‾‾
  |__________→ Training Size


PYTHON EXAMPLE - Learning Curves
---------------------------------
from sklearn.model_selection import learning_curve
from sklearn.linear_model import Ridge, LinearRegression
import matplotlib.pyplot as plt
import numpy as np

# Compare OLS and Ridge
models = [
    ('OLS', LinearRegression()),
    ('Ridge α=1', Ridge(alpha=1.0))
]

for name, model in models:
    train_sizes, train_scores, val_scores = learning_curve(
        model, X, y, cv=5,
        train_sizes=np.linspace(0.1, 1.0, 10)
    )
    
    train_mean = train_scores.mean(axis=1)
    val_mean = val_scores.mean(axis=1)
    
    plt.figure(figsize=(10, 6))
    plt.plot(train_sizes, train_mean, 'o-', label='Training Error', linewidth=2)
    plt.plot(train_sizes, val_mean, 's-', label='Validation Error', linewidth=2)
    plt.xlabel('Training Set Size')
    plt.ylabel('Error (1 - R²)')
    plt.title(f'Learning Curve: {name}')
    plt.legend()
    plt.grid(True)
    plt.show()


GRIDSEARCHCV
-------------
DEFINITION:
Systematic hyperparameter tuning using cross-validation.
Tests all combinations of hyperparameters and selects the best.


PROCESS:
1. Define parameter grid (e.g., alpha values)
2. For each parameter combination:
   - Train model with those parameters
   - Evaluate using cross-validation
   - Record CV score
3. Select combination with best CV score


PYTHON EXAMPLE - GridSearchCV Basic
-----------------------------------
from sklearn.model_selection import GridSearchCV
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import numpy as np

# Define parameter grid
param_grid = {
    'ridge__alpha': np.logspace(-2, 4, 50)
}

# Create pipeline
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('ridge', Ridge())
])

# GridSearchCV
grid = GridSearchCV(pipe, param_grid, cv=5, scoring='r2')
grid.fit(X_train, y_train)

print(f"Best alpha: {grid.best_params_['ridge__alpha']:.6f}")
print(f"Best CV R²: {grid.best_score_:.4f}")
print(f"Test R²: {grid.score(X_test, y_test):.4f}")

# Access best model
best_model = grid.best_estimator_
y_pred = best_model.predict(X_test)


PYTHON EXAMPLE - GridSearchCV Ridge vs Lasso
---------------------------------------------
from sklearn.model_selection import GridSearchCV
from sklearn.linear_model import Ridge, Lasso
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import numpy as np

# Parameter grid for multiple models
param_grid = [
    {
        'ridge__alpha': np.logspace(-2, 4, 50)
    },
    {
        'lasso__alpha': np.logspace(-3, 1, 50)
    }
]

pipelines = [
    ('Ridge', Pipeline([
        ('scaler', StandardScaler()),
        ('ridge', Ridge())
    ])),
    ('Lasso', Pipeline([
        ('scaler', StandardScaler()),
        ('lasso', Lasso())
    ]))
]

for name, pipe in pipelines:
    grid = GridSearchCV(pipe, param_grid, cv=5, scoring='r2')
    grid.fit(X_train, y_train)
    
    print(f"\n{name}:")
    print(f"  Best params: {grid.best_params_}")
    print(f"  Best CV R²: {grid.best_score_:.4f}")
    print(f"  Test R²: {grid.score(X_test, y_test):.4f}")


CROSS-VALIDATION WITH REGULARIZATION
-------------------------------------
IMPORTANT: Always use cross-validation to select alpha (not test set!)

WRONG approach:
✗ Fit model with different alphas on test set
✗ Choose alpha that performs best on test set
✗ Report test performance (biased!)

RIGHT approach:
✓ Use cross-validation on training set
✓ Select best alpha from CV scores
✓ Train final model on all training data
✓ Report performance on held-out test set

Code:
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.linear_model import Ridge

# Split: train vs test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# GridSearchCV on training set only
grid = GridSearchCV(Ridge(), {'alpha': np.logspace(-2, 4, 50)}, cv=5)
grid.fit(X_train, y_train)

# Evaluate on test set
test_score = grid.score(X_test, y_test)
print(f"Test R²: {test_score:.4f}")


================================================================================
SUMMARY & QUICK REFERENCE TABLE
================================================================================

WHEN TO USE EACH TECHNIQUE:

Technique       Situation                          Key Feature
─────────────────────────────────────────────────────────────────
OLS             Few features, no overfitting       Simplest, fastest
Ridge           Correlated features                Shrinks coefficients
Lasso           Need feature selection             Zeros out features
Elastic Net     Many correlated features          Balanced approach
─────────────────────────────────────────────────────────────────


KEY FORMULAS QUICK REFERENCE:

Linear Regression:       Y = β₀ + β₁X + ε
Multiple Regression:     β̂ = (XᵀX)⁻¹XᵀY
Ridge Loss:              L = ||Y - Xβ||² + α||β||²
Lasso Loss:              L = ||Y - Xβ||² + α||β||₁
Elastic Net:             L = ||Y - Xβ||² + α(ρ||β||₁ + (1-ρ)||β||²)
R²:                      R² = 1 - (SS_res / SS_tot)
Adjusted R²:             Adj-R² = 1 - [(1-R²)(n-1)/(n-p-1)]
RMSE:                    RMSE = √(Σ(yᵢ - ŷᵢ)² / n)
MAE:                     MAE = (Σ|yᵢ - ŷᵢ|) / n
VIF:                     VIF_i = 1 / (1 - R²_i)


METRIC SELECTION GUIDE:

Use R² when:
✓ Interpreting as "variance explained"
✓ Comparing models with same features
✓ Want 0-1 scale

Use Adjusted R² when:
✓ Comparing models with different numbers of features
✓ Want to penalize model complexity

Use RMSE when:
✓ Need error in same units as target
✓ Want to penalize large errors
✓ Have few outliers

Use MAE when:
✓ Need error in same units as target
✓ Have outliers (robust metric)
✓ Want interpretable average error


HYPERPARAMETER TUNING CHECKLIST:

□ Scale features with StandardScaler
□ Split data into train/test (80/20)
□ Define parameter grid (e.g., alpha values)
□ Use GridSearchCV or CV-specific methods (RidgeCV, LassoCV)
□ Use cross-validation on training set only
□ Select best parameters from CV results
□ Evaluate on test set (not used in selection)
□ Report both CV and test performance


COMMON PITFALLS TO AVOID:

❌ Not scaling features → Ridge/Lasso won't work well
❌ Using test set for parameter selection → Biased estimates
❌ Ignoring multicollinearity → Unstable coefficients
❌ Adding too many features → Overfitting
❌ Using single train-test split → High variance estimates
❌ Not removing outliers → Affects all models
❌ Comparing metrics from different scales → Unfair comparison
❌ Training on all data then evaluating → Data leakage


================================================================================
END OF COMPREHENSIVE GUIDE
================================================================================

All topics from the Regression Coding Problems Bootcamp covered with:
• Clear definitions
• Mathematical formulas
• Python code examples
• Practical interpretations
• Real-world applications

================================================================================
