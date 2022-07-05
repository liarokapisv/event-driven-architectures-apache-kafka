import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import sympy

max_partition_count = 120
max_cluster_size = 12
partition_counts = list(range(61,max_partition_count+1))
cluster_sizes = list(range(1,max_cluster_size+1))

supported_sizes = np.zeros((len(cluster_sizes), len(partition_counts)))

for size in cluster_sizes:
    for count in partition_counts:
        supported_sizes[size-1][count-61] = len(list(filter(lambda x: x <= size, sympy.divisors(count))))

fig, ax = plt.subplots()
im = ax.imshow(supported_sizes)

# Show all ticks and label them with the respective list entries
ax.set_xticks(np.arange(len(partition_counts)), labels=partition_counts, rotation="vertical")
ax.set_yticks(np.arange(len(cluster_sizes)), labels=cluster_sizes)

# Rotate the tick labels and set their alignment.
# plt.setp(ax.get_xticklabels(), rotation=45, ha="right",
#          rotation_mode="anchor")

# Loop over data dimensions and create text annotations.
for i in range(len(partition_counts)):
    for j in range(len(cluster_sizes)):
        text = ax.text(i, j, int(supported_sizes[j, i]),
                       ha="center", va="center", color="w")

ax.invert_yaxis()
ax.set_title("Optimally supported cluster sizes up to a given size")
ax.set_xlabel("Partition count")
ax.set_ylabel("Cluster size")

fig.set_dpi(96)
fig.set_size_inches(12, 6)
fig.tight_layout(rect=[0.015, -0.2, 1, 1.2])

plt.show()
