import joblib
from sklearn.tree import export_text

# Load the Random Forest model
model = joblib.load("random_forest_model.pkl")  # adjust filename if needed

print("✅ Model loaded successfully!")
print("Model type:", type(model))

# Show number of trees
print("Number of trees in the forest:", len(model.estimators_))

# Show feature importances
print("Feature importances:", model.feature_importances_)

# Show one tree structure (first tree)
tree_rules = export_text(model.estimators_[0])
print("\nRules of the first tree:\n")
print(tree_rules)
